/**
 * The search index behind `search_docs`. Seeded from the doc sitemaps (URL +
 * title + section only — cheap, no page fetches) and ranked with a small
 * keyword scorer over the title/slug/section. The model uses the results to pick
 * a URL and calls `fetch_doc` to read it.
 *
 * Ranking (`rankEntries`) and URL→entry derivation (`deriveEntry`) are pure and
 * unit-tested; `searchDocs` wraps them with a TTL-cached sitemap fetch.
 */
import { loadConfig } from "@/config.ts";
import { SITEMAPS } from "@/docs/sources.ts";

export interface DocEntry {
  url: string;
  /** Human title derived from the final path segment. */
  title: string;
  /** Top-level section (first path segment), e.g. "manage", "knowledge-hub". */
  section: string;
}

export interface DocHit extends DocEntry {
  /** Relevance score; higher is better. Present only in search results. */
  score: number;
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are",
  "how", "do", "i", "my", "with", "can", "what", "does", "netbird",
]);

/** Lowercase, split on non-alphanumerics, drop stopwords and 1-char tokens. */
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function titleCase(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive a catalog entry from a public doc URL. */
export function deriveEntry(url: string): DocEntry {
  const { hostname, pathname } = new URL(url);
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[0] ?? "";
  const last = segments[segments.length - 1];
  const title = last
    ? titleCase(last)
    : hostname.startsWith("docs.")
      ? "Introduction"
      : "NetBird";
  return { url, title, section };
}

/**
 * Score entries against a query and return the top `limit`. Token overlap with
 * the title weighs most, then the slug, then the section; a whole-query substring
 * in the title gets a bonus so exact topic pages float up.
 */
export function rankEntries(entries: DocEntry[], query: string, limit: number): DocHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const phrase = query.trim().toLowerCase();

  const hits: DocHit[] = [];
  for (const e of entries) {
    const titleTokens = new Set(tokenize(e.title));
    const slug = e.url.toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      if (titleTokens.has(t)) score += 3;
      else if (slug.includes(t)) score += 2;
      if (e.section === t) score += 2;
    }
    if (score > 0 && e.title.toLowerCase().includes(phrase)) score += 4;
    if (score > 0) hits.push({ ...e, score });
  }
  hits.sort((a, b) => b.score - a.score || a.url.length - b.url.length);
  return hits.slice(0, limit);
}

// ── sitemap-seeded catalog, cached with a TTL ────────────────────────────────

interface CacheState {
  entries: DocEntry[];
  builtAtMs: number;
}
let cache: CacheState | null = null;
let inflight: Promise<DocEntry[]> | null = null;

/** Extract <loc> URLs from a sitemap (urlset or index — we fetch shards directly). */
function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!);
}

async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "netbird-assistant" } });
    if (!res.ok) {
      console.error(`docs catalog: sitemap ${url} returned ${res.status}`);
      return [];
    }
    return extractLocs(await res.text());
  } catch (err) {
    // Fail soft: a missing sitemap shrinks the index, it doesn't break chat.
    console.error(`docs catalog: sitemap ${url} failed:`, (err as Error).message);
    return [];
  }
}

async function buildCatalog(): Promise<DocEntry[]> {
  const seen = new Set<string>();
  const entries: DocEntry[] = [];
  const perSitemap = await Promise.all(
    SITEMAPS.map(async (s) => ({ src: s, locs: await fetchSitemap(s.url) })),
  );
  for (const { src, locs } of perSitemap) {
    for (const url of locs) {
      const clean = url.replace(/\/+$/, "") || url;
      if (!src.include(clean) || seen.has(clean)) continue;
      seen.add(clean);
      entries.push(deriveEntry(clean));
    }
  }
  return entries;
}

async function getCatalog(): Promise<DocEntry[]> {
  const ttlMs = loadConfig().DOCS_CACHE_TTL_SEC * 1000;
  if (cache && Date.now() - cache.builtAtMs < ttlMs) return cache.entries;
  // Collapse concurrent rebuilds into one fetch.
  if (!inflight) {
    inflight = buildCatalog()
      .then((entries) => {
        cache = { entries, builtAtMs: Date.now() };
        return entries;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Search the doc catalog. Returns [] if the catalog could not be built. */
export async function searchDocs(query: string, limit?: number): Promise<DocHit[]> {
  const cfg = loadConfig();
  const n = Math.min(limit ?? cfg.DOCS_MAX_SEARCH_RESULTS, cfg.DOCS_MAX_SEARCH_RESULTS);
  const entries = await getCatalog();
  return rankEntries(entries, query, n);
}

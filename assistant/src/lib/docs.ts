// A read-only client for the public NetBird docs: which hosts may be reached,
// the sitemap-derived page catalog, and plain-text extraction for one page.
// The docs tools are its only callers; nothing here knows about tools.
import MiniSearch from "minisearch";

export const DOCS_CACHE_TTL_MS = 6 * 3600 * 1000;
export const FETCH_MAX_BYTES = 60_000;

const DOCS_HOST = "docs.netbird.io";

const SITE_HOST = "netbird.io";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/netbirdio/docs/main/src/pages";
const GITHUB_RAW_HOST = "raw.githubusercontent.com";

export const DOC_FETCH_USER_AGENT = "netbird-assistant";

const FETCH_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  DOCS_HOST,
  SITE_HOST,
  GITHUB_RAW_HOST,
]);

const PUBLIC_HOST_ALLOWLIST: ReadonlySet<string> = new Set([DOCS_HOST, SITE_HOST]);

export class DocFetchError extends Error {}

function assertAllowed(host: string, allowlist: ReadonlySet<string>, url: string): void {
  if (!allowlist.has(host)) {
    throw new DocFetchError(`refusing to fetch disallowed host: ${host} (${url})`);
  }
}

// fetch() follows redirects, so the allowlist must hold for the final URL too.
async function fetchAllowed(url: string, allowlist: ReadonlySet<string>): Promise<Response> {
  assertAllowed(new URL(url).hostname, allowlist, url);
  const res = await fetch(url, { headers: { "User-Agent": DOC_FETCH_USER_AGENT } });
  if (res.url) assertAllowed(new URL(res.url).hostname, allowlist, res.url);
  return res;
}

function cap(text: string, maxBytes: number): { text: string; truncated: boolean } {
  if (text.length <= maxBytes) return { text, truncated: false };
  return { text: text.slice(0, maxBytes) + "\n\n…[truncated]", truncated: true };
}

export interface FetchedDoc {
  url: string;
  title: string;
  text: string;
  source: "mdx" | "html";
  truncated: boolean;
}

export function rawCandidates(url: string): string[] {
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return [`${GITHUB_RAW_BASE}/introduction.mdx`];
  return [`${GITHUB_RAW_BASE}/${path}.mdx`, `${GITHUB_RAW_BASE}/${path}/index.mdx`];
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&#x27;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp|mdash|ndash);/g, (m) => HTML_ENTITIES[m] ?? m);
}

export function cleanMdx(mdx: string): { text: string; description: string | null } {
  const descMatch = /export\s+const\s+description\s*=\s*(['"])(.*?)\1/s.exec(mdx);
  const description = descMatch ? descMatch[2]!.trim() : null;
  const text = mdx
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith("import ") && !t.startsWith("export ");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, description };
}

const DROP_SELECTOR = "script,style,noscript,svg,nav,header,footer,aside,form,button,iframe";
const BLOCK_TAGS = /<\/(?:p|li|h[1-6]|pre|tr|blockquote|section|article|div|ul|ol)>/gi;

export async function htmlToText(html: string): Promise<string> {
  const cleaned = await new HTMLRewriter()
    .on(DROP_SELECTOR, {
      element(e) {
        e.remove();
      },
    })
    .transform(new Response(html))
    .text();
  const text = decodeEntities(
    cleaned
      .replace(BLOCK_TAGS, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstHeading(text: string): string | null {
  const m = /^#{1,3}\s+(.+)$/m.exec(text);
  return m ? m[1]!.trim() : null;
}

async function getMdx(url: string): Promise<{ text: string; title: string } | null> {
  for (const candidate of rawCandidates(url)) {
    const res = await fetchAllowed(candidate, FETCH_HOST_ALLOWLIST);
    if (!res.ok) continue;
    const { text, description } = cleanMdx(await res.text());
    const title = firstHeading(text) ?? description ?? deriveTitle(url);
    return { text, title };
  }
  return null;
}

async function getHtml(url: string): Promise<{ text: string; title: string }> {
  const res = await fetchAllowed(url, PUBLIC_HOST_ALLOWLIST);
  if (!res.ok) throw new DocFetchError(`fetch ${url} returned ${res.status}`);
  const html = await res.text();
  const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]!.trim()) : deriveTitle(url);
  return { text: await htmlToText(html), title };
}

function deriveTitle(url: string): string {
  const seg = new URL(url).pathname.split("/").findLast(Boolean);
  return seg ? seg.replace(/[-_]+/g, " ") : url;
}

export async function fetchDoc(url: string): Promise<FetchedDoc> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DocFetchError(`invalid url: ${url}`);
  }
  if (parsed.protocol !== "https:") throw new DocFetchError(`only https is allowed: ${url}`);
  assertAllowed(parsed.hostname, PUBLIC_HOST_ALLOWLIST, url);

  let got: { text: string; title: string };
  let source: FetchedDoc["source"];
  if (parsed.hostname === DOCS_HOST) {
    const mdx = await getMdx(url).catch(() => null);
    if (mdx) {
      got = mdx;
      source = "mdx";
    } else {
      got = await getHtml(url);
      source = "html";
    }
  } else {
    got = await getHtml(url);
    source = "html";
  }

  const { text, truncated } = cap(got.text, FETCH_MAX_BYTES);
  return { url: parsed.toString(), title: got.title, text, source, truncated };
}

const MAX_SEARCH_RESULTS = 8;

interface SitemapSource {
  url: string;
  include: (url: string) => boolean;
}

const SITEMAPS: readonly SitemapSource[] = [
  { url: `https://${DOCS_HOST}/sitemap.xml`, include: () => true },
  {
    url: `https://${SITE_HOST}/sitemap-0.xml`,
    include: (u) => u.includes("/knowledge-hub"),
  },
];

export interface DocEntry {
  url: string;
  title: string;
  section: string;
}

export interface DocHit extends DocEntry {
  score: number;
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are",
  "how", "do", "i", "my", "with", "can", "what", "does", "netbird",
]);

function titleCase(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function deriveEntry(url: string): DocEntry {
  const { hostname, pathname } = new URL(url);
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[0] ?? "";
  const last = segments.at(-1);
  const rootTitle = hostname.startsWith("docs.") ? "Introduction" : "NetBird";
  return { url, title: last ? titleCase(last) : rootTitle, section };
}

function buildIndex(entries: DocEntry[]): MiniSearch {
  const index = new MiniSearch({
    fields: ["title", "section", "slug"],
    storeFields: ["url", "title", "section"],
    processTerm: (term) => {
      const t = term.toLowerCase();
      return t.length > 1 && !STOPWORDS.has(t) ? t : null;
    },
    searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(
    entries.map((e) => ({
      ...e,
      id: e.url,
      slug: new URL(e.url).pathname.replace(/[/_-]+/g, " "),
    })),
  );
  return index;
}

export function rankEntries(entries: DocEntry[], query: string, limit: number): DocHit[] {
  return searchIndex(buildIndex(entries), query, limit);
}

function searchIndex(index: MiniSearch, query: string, limit: number): DocHit[] {
  return index.search(query).slice(0, limit).map((r) => ({
    url: r.url as string,
    title: r.title as string,
    section: r.section as string,
    score: r.score,
  }));
}

let catalogCache: { index: MiniSearch; builtAtMs: number } | null = null;
let catalogInflight: Promise<MiniSearch> | null = null;

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]!);
}

async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": DOC_FETCH_USER_AGENT } });
    if (!res.ok) {
      console.error(`docs catalog: sitemap ${url} returned ${res.status}`);
      return [];
    }
    return extractLocs(await res.text());
  } catch (err) {
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

async function getCatalog(): Promise<MiniSearch> {
  if (catalogCache && Date.now() - catalogCache.builtAtMs < DOCS_CACHE_TTL_MS) {
    return catalogCache.index;
  }

  catalogInflight ??= buildCatalog()
    .then((entries) => {
      const index = buildIndex(entries);
      catalogCache = { index, builtAtMs: Date.now() };
      return index;
    })
    .finally(() => {
      catalogInflight = null;
    });
  return catalogInflight;
}

export async function searchCatalog(query: string, limit?: number): Promise<DocHit[]> {
  const n = Math.min(limit ?? MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS);
  return searchIndex(await getCatalog(), query, n);
}

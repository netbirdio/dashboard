/**
 * `fetch_doc` — retrieve one public doc page as clean text. For docs.netbird.io
 * we resolve the URL to its raw MDX on GitHub (authored source, no HTML noise),
 * trying `<path>.mdx` then `<path>/index.mdx`; generated sections (e.g. /api/*)
 * have no source file and fall back to scraping the rendered page. netbird.io
 * (knowledge hub) is always scraped.
 *
 * Every fetch is host-allowlisted (SSRF guard), size-capped, and TTL-cached.
 * `htmlToText`, `cleanMdx`, and `rawCandidates` are pure and unit-tested.
 */
import { loadConfig } from "@/config.ts";
import {
  DOCS_HOST,
  FETCH_HOST_ALLOWLIST,
  GITHUB_RAW_BASE,
  PUBLIC_HOST_ALLOWLIST,
} from "@/docs/sources.ts";

export interface FetchedDoc {
  url: string;
  title: string;
  text: string;
  /** "mdx" when read from source, "html" when scraped from the rendered page. */
  source: "mdx" | "html";
  truncated: boolean;
}

/** Raised when a URL is not fetchable (bad host, not found). Surfaced to the model. */
export class DocFetchError extends Error {}

// ── URL → GitHub raw MDX candidates ──────────────────────────────────────────

/** Candidate raw MDX URLs for a docs.netbird.io page, in resolution order. */
export function rawCandidates(url: string): string[] {
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return [`${GITHUB_RAW_BASE}/introduction.mdx`];
  return [`${GITHUB_RAW_BASE}/${path}.mdx`, `${GITHUB_RAW_BASE}/${path}/index.mdx`];
}

// ── content cleanup ──────────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&#x27;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp|mdash|ndash);/g, (m) => HTML_ENTITIES[m] ?? m);
}

/**
 * Strip MDX machinery the model doesn't need: `import` lines and `export`
 * statements. The `export const description = '…'` line, when present, is lifted
 * out and returned so callers can use it as a summary.
 */
export function cleanMdx(mdx: string): { text: string; description: string | null } {
  let description: string | null = null;
  const descMatch = mdx.match(/export\s+const\s+description\s*=\s*(['"])(.*?)\1/s);
  if (descMatch) description = descMatch[2]!.trim();
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

/**
 * Extract readable text from an HTML page. Best-effort, used only for scraped
 * pages (generated /api/* and the knowledge hub). HTMLRewriter removes noise
 * elements *and their contents* from the output; we then insert line breaks at
 * block boundaries, strip the remaining tags, and decode entities.
 */
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

/** First markdown/MDX heading, used as a title when the slug isn't descriptive. */
function firstHeading(text: string): string | null {
  const m = text.match(/^#{1,3}\s+(.+)$/m);
  return m ? m[1]!.trim() : null;
}

// ── fetch + cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  doc: FetchedDoc;
  atMs: number;
}
const cache = new Map<string, CacheEntry>();

function assertAllowed(host: string, allowlist: ReadonlySet<string>, url: string): void {
  if (!allowlist.has(host)) {
    throw new DocFetchError(`refusing to fetch disallowed host: ${host} (${url})`);
  }
}

function cap(text: string, maxBytes: number): { text: string; truncated: boolean } {
  if (text.length <= maxBytes) return { text, truncated: false };
  return { text: text.slice(0, maxBytes) + "\n\n…[truncated]", truncated: true };
}

async function getMdx(url: string): Promise<{ text: string; title: string } | null> {
  for (const candidate of rawCandidates(url)) {
    assertAllowed(new URL(candidate).hostname, FETCH_HOST_ALLOWLIST, candidate);
    const res = await fetch(candidate, { headers: { "User-Agent": "netbird-assistant" } });
    if (!res.ok) continue;
    const { text, description } = cleanMdx(await res.text());
    const title = firstHeading(text) ?? description ?? deriveTitle(url);
    return { text, title };
  }
  return null;
}

async function getHtml(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, { headers: { "User-Agent": "netbird-assistant" } });
  if (!res.ok) throw new DocFetchError(`fetch ${url} returned ${res.status}`);
  const html = await res.text();
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]!.trim()) : deriveTitle(url);
  return { text: await htmlToText(html), title };
}

function deriveTitle(url: string): string {
  const seg = new URL(url).pathname.split("/").filter(Boolean).pop();
  return seg ? seg.replace(/[-_]+/g, " ") : url;
}

/**
 * Fetch a public NetBird doc page as clean text. Only docs.netbird.io and
 * netbird.io URLs are accepted (SSRF guard). Throws DocFetchError on a bad host
 * or a page that can't be retrieved.
 */
export async function fetchDoc(url: string): Promise<FetchedDoc> {
  const cfg = loadConfig();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DocFetchError(`invalid url: ${url}`);
  }
  if (parsed.protocol !== "https:") throw new DocFetchError(`only https is allowed: ${url}`);
  assertAllowed(parsed.hostname, PUBLIC_HOST_ALLOWLIST, url);

  const key = parsed.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.atMs < cfg.DOCS_CACHE_TTL_SEC * 1000) return hit.doc;

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

  const { text, truncated } = cap(got.text, cfg.DOCS_FETCH_MAX_BYTES);
  const doc: FetchedDoc = { url: key, title: got.title, text, source, truncated };
  cache.set(key, { doc, atMs: Date.now() });
  return doc;
}

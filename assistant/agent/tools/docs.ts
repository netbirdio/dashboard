import MiniSearch from "minisearch";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import type { ServerToolResult } from "@/tools/index.ts";

const DOCS_CACHE_TTL_MS = 6 * 3600 * 1000;
const FETCH_MAX_BYTES = 60_000;
const MAX_SEARCH_RESULTS = 8;

const DOCS_HOST = "docs.netbird.io";

const SITE_HOST = "netbird.io";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/netbirdio/docs/main/src/pages";
const GITHUB_RAW_HOST = "raw.githubusercontent.com";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/netbirdio/netbird/main/shared/management/http/api/openapi.yml";

const DOC_FETCH_USER_AGENT = "netbird-assistant";

const FETCH_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  DOCS_HOST,
  SITE_HOST,
  GITHUB_RAW_HOST,
]);

const PUBLIC_HOST_ALLOWLIST: ReadonlySet<string> = new Set([DOCS_HOST, SITE_HOST]);

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

export function buildIndex(entries: DocEntry[]): MiniSearch {
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

export async function searchDocs(query: string, limit?: number): Promise<DocHit[]> {
  const n = Math.min(limit ?? MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS);
  return searchIndex(await getCatalog(), query, n);
}

export interface FetchedDoc {
  url: string;
  title: string;
  text: string;
  source: "mdx" | "html";
  truncated: boolean;
}

export class DocFetchError extends Error {}

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

export interface OpenApiIndex {
  schemas: Map<string, string>;
  endpoints: { method: string; path: string; summary: string }[];
}

const SYNONYMS: Record<string, string[]> = {
  peer: ["Peer", "PeerBatch", "PeerMinimum"],
  group: ["Group", "GroupMinimum"],
  policy: ["Policy", "PolicyRule", "PolicyMinimum"],
  route: ["Route", "RouteRequest"],
  dns: ["NameserverGroup", "Nameserver", "DNSSettings"],
  nameserver: ["NameserverGroup", "Nameserver"],
  setupkey: ["SetupKey", "SetupKeyBase"],
  user: ["User"],
  event: ["Event"],
  account: ["Account", "AccountSettings"],
  network: ["Network", "NetworkResource"],
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

export function indexOpenApi(yamlText: string): OpenApiIndex {
  const doc = parseYaml(yamlText) as {
    paths?: Record<string, Record<string, { summary?: unknown } | undefined>>;
    components?: { schemas?: Record<string, unknown> };
  } | null;

  const schemas = new Map<string, string>();
  for (const [name, schema] of Object.entries(doc?.components?.schemas ?? {})) {
    schemas.set(name, stringifyYaml({ [name]: schema }).trimEnd());
  }

  const endpoints: OpenApiIndex["endpoints"] = [];
  for (const [path, operations] of Object.entries(doc?.paths ?? {})) {
    if (!operations || typeof operations !== "object") continue;
    for (const [method, op] of Object.entries(operations)) {
      if (!HTTP_METHODS.has(method)) continue;
      const summary = op && typeof op.summary === "string" ? op.summary : "";
      endpoints.push({ method: method.toUpperCase(), path, summary });
    }
  }
  return { schemas, endpoints };
}

function refsIn(block: string): string[] {
  return [...block.matchAll(/\$ref:\s*['"]?#\/components\/schemas\/(\w+)/g)].map((m) => m[1]!);
}

function matchSchemas(index: OpenApiIndex, q: string, tokens: string[]): Set<string> {
  const wanted = new Set<string>();
  for (const [k, names] of Object.entries(SYNONYMS)) {
    if (q.includes(k)) names.forEach((n) => index.schemas.has(n) && wanted.add(n));
  }
  for (const name of index.schemas.keys()) {
    if (tokens.some((t) => name.toLowerCase().includes(t))) wanted.add(name);
  }
  const primary = [...wanted].slice(0, 4);
  const expanded = new Set(primary);
  for (const n of primary) {
    const block = index.schemas.get(n);
    if (block) refsIn(block).forEach((r) => index.schemas.has(r) && expanded.add(r));
  }
  return expanded;
}

export function queryOpenApi(index: OpenApiIndex, query: string, maxBytes: number): string {
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);

  const endpoints = index.endpoints
    .filter((e) => tokens.some((t) => e.path.toLowerCase().includes(t) || e.summary.toLowerCase().includes(t)))
    .slice(0, 15);

  const parts: string[] = [];
  if (endpoints.length) {
    parts.push("## Endpoints\n" + endpoints.map((e) => `${e.method} ${e.path} — ${e.summary}`).join("\n"));
  }
  let budget = maxBytes;
  const schemaTexts: string[] = [];
  for (const n of matchSchemas(index, q, tokens)) {
    const block = index.schemas.get(n);
    if (!block) continue;
    if (block.length > budget) break;
    budget -= block.length;
    schemaTexts.push(block);
  }
  if (schemaTexts.length) parts.push("## Schemas\n```yaml\n" + schemaTexts.join("\n") + "\n```");

  return parts.join("\n\n");
}

let apiCache: { index: OpenApiIndex; atMs: number } | null = null;
let apiInflight: Promise<OpenApiIndex> | null = null;

async function getIndex(): Promise<OpenApiIndex> {
  if (apiCache && Date.now() - apiCache.atMs < DOCS_CACHE_TTL_MS) return apiCache.index;
  apiInflight ??= fetch(OPENAPI_URL, { headers: { "User-Agent": DOC_FETCH_USER_AGENT } })
    .then(async (res) => {
      if (!res.ok) throw new Error(`openapi fetch ${res.status}`);
      const index = indexOpenApi(await res.text());
      apiCache = { index, atMs: Date.now() };
      return index;
    })
    .finally(() => {
      apiInflight = null;
    });
  return apiInflight;
}

export async function runApiTool(input: unknown): Promise<ServerToolResult> {
  const query = (input as { query?: unknown })?.query;
  if (typeof query !== "string" || !query.trim()) {
    return { ok: false, content: "invalid input: get_api_reference needs a `query`.", summary: "api query rejected" };
  }
  try {
    const index = await getIndex();
    const body = queryOpenApi(index, query, FETCH_MAX_BYTES);
    if (!body) {
      return { ok: true, content: `No API endpoints or schemas matched "${query}".`, summary: `No API match for "${query}"` };
    }
    return { ok: true, content: `NetBird API reference for "${query}":\n\n${body}`, summary: `API reference: "${query}"` };
  } catch {
    return { ok: false, content: "Could not load the API reference right now.", summary: "API reference unavailable" };
  }
}

const SearchInput = z.object({
  query: z.string().min(1).max(400),
  limit: z.number().int().positive().max(20).optional(),
});
const FetchInput = z.object({ url: z.string().min(1).max(2048) });

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "netbird.io";
  }
}

export function isDocTool(name: string): boolean {
  return name === "search_docs" || name === "fetch_doc";
}

async function runSearch(input: unknown): Promise<ServerToolResult> {
  const parsed = SearchInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, content: "invalid input: search_docs needs a non-empty `query`.", summary: "search rejected" };
  }
  const { query, limit } = parsed.data;
  const hits = await searchDocs(query, limit);
  if (hits.length === 0) {
    return {
      ok: true,
      content: `No documentation pages matched "${query}". Try different keywords.`,
      summary: `No docs matched "${query}"`,
    };
  }
  const lines = hits.map((h) => `- ${h.title} [${h.section}] — ${h.url}`).join("\n");
  return {
    ok: true,
    content: `Documentation pages matching "${query}":\n${lines}\n\nCall fetch_doc with a URL to read one.`,
    summary: `Searched docs for "${query}" — ${hits.length} result${hits.length === 1 ? "" : "s"}`,
  };
}

async function runFetch(input: unknown): Promise<ServerToolResult> {
  const parsed = FetchInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, content: "invalid input: fetch_doc needs a `url`.", summary: "fetch rejected" };
  }
  try {
    const doc = await fetchDoc(parsed.data.url);
    const note = doc.truncated ? " (truncated)" : "";
    return {
      ok: true,
      content: `# ${doc.title}\nSource: ${doc.url}${note}\n\n${doc.text}`,
      summary: `Read ${doc.title}`,
      source: { url: doc.url, title: doc.title, domain: hostOf(doc.url) },
    };
  } catch (err) {
    const msg = err instanceof DocFetchError ? err.message : "failed to fetch the page";
    return { ok: false, content: `Could not fetch that page: ${msg}`, summary: "Fetch failed" };
  }
}

export async function runDocTool(name: string, input: unknown): Promise<ServerToolResult> {
  if (name === "search_docs") return runSearch(input);
  if (name === "fetch_doc") return runFetch(input);
  return { ok: false, content: `unknown doc tool: ${name}`, summary: "unknown tool" };
}

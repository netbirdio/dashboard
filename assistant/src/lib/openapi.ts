// A searchable index of the NetBird management OpenAPI spec: endpoints, their
// component schemas, and the ranking that picks the slice worth printing.
// The get_api_reference tool is its only caller; nothing here knows about tools.
import MiniSearch from "minisearch";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { DOC_FETCH_USER_AGENT, DOCS_CACHE_TTL_MS } from "@/lib/docs.ts";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/netbirdio/netbird/main/shared/management/http/api/openapi.yml";

export interface Endpoint {
  method: string;
  path: string;
  summary: string;
  tags: string[];
  // Schemas this operation references — the structural link from a matched
  // endpoint to the shapes worth printing with it.
  refs: string[];
}

export interface OpenApiIndex {
  schemas: Map<string, string>;
  endpoints: Endpoint[];
  endpointSearch: MiniSearch;
  schemaSearch: MiniSearch;
}

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

const MAX_ENDPOINTS = 15;
const MAX_SEED_SCHEMAS = 4;
// Only the closest endpoint paths donate their $refs, and the whole schema
// section is capped: a loose query matches many endpoints, and every one of
// them dragging in its request/response pair buries what was asked for.
const MAX_REF_ENDPOINTS = 6;
const MAX_SCHEMAS = 12;

function refsIn(block: string): string[] {
  return [...block.matchAll(/\$ref:\s*['"]?#\/components\/schemas\/(\w+)/g)].map((m) => m[1]!);
}

// "NameserverGroup" -> "Nameserver Group", so "nameserver group" matches the
// schema without a synonym table saying so.
function splitWords(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

function propertyNames(block: string): string {
  return [...block.matchAll(/^\s{4,}(\w+):/gm)].map((m) => m[1]!).join(" ");
}

function textIndex(fields: string[], docs: Record<string, unknown>[]): MiniSearch {
  const index = new MiniSearch({
    fields,
    storeFields: ["key"],
    processTerm: (term) => (term.length > 1 ? term.toLowerCase() : null),
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: "OR" },
  });
  index.addAll(docs.map((d, i) => ({ ...d, id: i })));
  return index;
}

// Every term first, so "nameserver group" doesn't match everything named
// "group"; the OR pass is the fallback for queries no single doc satisfies.
function rank<T>(index: MiniSearch, query: string, limit: number): T[] {
  const all = index.search(query, { combineWith: "AND" });
  const hits = all.length ? all : index.search(query, { combineWith: "OR" });
  return hits.slice(0, limit).map((r) => r.key as T);
}

export function indexOpenApi(yamlText: string): OpenApiIndex {
  const doc = parseYaml(yamlText) as {
    paths?: Record<string, Record<string, unknown> | undefined>;
    components?: { schemas?: Record<string, unknown> };
  } | null;

  const schemas = new Map<string, string>();
  for (const [name, schema] of Object.entries(doc?.components?.schemas ?? {})) {
    schemas.set(name, stringifyYaml({ [name]: schema }).trimEnd());
  }

  const endpoints: Endpoint[] = [];
  for (const [path, operations] of Object.entries(doc?.paths ?? {})) {
    if (!operations || typeof operations !== "object") continue;
    for (const [method, op] of Object.entries(operations)) {
      if (!HTTP_METHODS.has(method)) continue;
      const o = (op ?? {}) as { summary?: unknown; tags?: unknown };
      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: typeof o.summary === "string" ? o.summary : "",
        tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [],
        refs: refsIn(stringifyYaml(op ?? {})),
      });
    }
  }

  return {
    schemas,
    endpoints,
    endpointSearch: textIndex(
      ["path", "summary", "tags"],
      endpoints.map((e, i) => ({
        key: i,
        path: splitWords(e.path.replace(/[/{}]/g, " ")),
        summary: e.summary,
        tags: e.tags.join(" "),
      })),
    ),
    schemaSearch: textIndex(
      ["name", "words", "properties"],
      [...schemas].map(([name, block]) => ({
        key: name,
        name,
        words: splitWords(name),
        properties: propertyNames(block),
      })),
    ),
  };
}

export function queryOpenApi(index: OpenApiIndex, query: string, maxBytes: number): string {
  const matched = rank<number>(index.endpointSearch, query, MAX_ENDPOINTS)
    .map((i) => index.endpoints[i])
    .filter((e): e is Endpoint => e !== undefined);

  // Seeds come from the schemas the query names directly and from the ones the
  // matched endpoints reference; the second is what makes "dns" reach
  // NameserverGroup without a synonym table.
  // Insertion order is relevance order from here down, and the cap cuts the tail.
  const seeds = new Set<string>();
  for (const name of rank<string>(index.schemaSearch, query, MAX_SEED_SCHEMAS)) seeds.add(name);
  // Distinct paths, not rows: one path repeats per method, so counting rows
  // spends the whole ref budget on two or three endpoints.
  const donors = new Set<string>();
  for (const e of matched) {
    if (!donors.has(e.path)) {
      if (donors.size >= MAX_REF_ENDPOINTS) break;
      donors.add(e.path);
    }
    for (const ref of e.refs) if (index.schemas.has(ref)) seeds.add(ref);
  }

  // Breadth-first from the seeds so a shape nested behind a wrapper still
  // arrives: the five posture checks hang off Checks, itself a $ref away from
  // the endpoint. Bounded by the cap rather than by a fixed depth.
  const wanted = new Set(seeds);
  const queue = [...seeds];
  while (queue.length && wanted.size < MAX_SCHEMAS) {
    const block = index.schemas.get(queue.shift()!);
    if (!block) continue;
    for (const ref of refsIn(block)) {
      if (!index.schemas.has(ref) || wanted.has(ref)) continue;
      wanted.add(ref);
      queue.push(ref);
      if (wanted.size >= MAX_SCHEMAS) break;
    }
  }

  const parts: string[] = [];
  if (matched.length) {
    parts.push(
      "## Endpoints\n" + matched.map((e) => `${e.method} ${e.path} — ${e.summary}`).join("\n"),
    );
  }

  let budget = maxBytes;
  const schemaTexts: string[] = [];
  for (const name of [...wanted].slice(0, MAX_SCHEMAS)) {
    const block = index.schemas.get(name);
    // Skip an oversized block rather than stopping — a big schema early on
    // used to hide every smaller one behind it.
    if (!block || block.length > budget) continue;
    budget -= block.length;
    schemaTexts.push(block);
  }
  if (schemaTexts.length) parts.push("## Schemas\n```yaml\n" + schemaTexts.join("\n") + "\n```");

  return parts.join("\n\n");
}

let apiCache: { index: OpenApiIndex; atMs: number } | null = null;
let apiInflight: Promise<OpenApiIndex> | null = null;

export async function loadOpenApiIndex(): Promise<OpenApiIndex> {
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

/**
 * `get_api_reference` — answer questions about the NetBird REST API (what an
 * endpoint returns, request/response fields) from the live OpenAPI spec. Useful
 * both for the user ("what fields does the peers endpoint return?") and for the
 * model to know a response shape. Server-executed; reads only a public spec.
 *
 * The spec is large YAML; rather than add a parser we index it by line (schema
 * blocks + endpoints) and return the relevant slices as text — enough for the
 * model to read. `indexOpenApi` and `queryOpenApi` are pure and unit-tested;
 * `getApiReference` wraps them with a TTL-cached fetch.
 */
import { loadConfig } from "@/config.ts";
import { OPENAPI_URL } from "@/docs/sources.ts";
import type { ServerToolResult } from "@/llm/serverTools.ts";

export interface OpenApiIndex {
  /** schema name → its YAML block text. */
  schemas: Map<string, string>;
  /** flat endpoint list. */
  endpoints: { method: string; path: string; summary: string }[];
}

/** Common query words → concrete schema names in the spec. */
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

/** Build a line-based index of schemas and endpoints from the OpenAPI YAML. */
export function indexOpenApi(yaml: string): OpenApiIndex {
  const lines = yaml.split("\n");
  const schemas = new Map<string, string>();
  const endpoints: OpenApiIndex["endpoints"] = [];

  // components/schemas: names at 4-space indent, block runs to the next 4-space name.
  const schStart = lines.findIndex((l) => l === "  schemas:");
  if (schStart >= 0) {
    let name: string | null = null;
    let buf: string[] = [];
    const flush = () => {
      if (name) schemas.set(name, buf.join("\n").trimEnd());
      name = null;
      buf = [];
    };
    for (let i = schStart + 1; i < lines.length; i++) {
      const l = lines[i]!;
      if (/^  \S/.test(l) && !/^    /.test(l)) break; // left the schemas block
      const m = l.match(/^    ([A-Za-z0-9_]+):$/);
      if (m) {
        flush();
        name = m[1]!;
      }
      if (name) buf.push(l);
    }
    flush();
  }

  // paths: `  /api/…:` then method keys with a summary.
  const pathStart = lines.findIndex((l) => l === "paths:");
  if (pathStart >= 0) {
    let path = "";
    for (let i = pathStart + 1; i < lines.length; i++) {
      const l = lines[i]!;
      if (/^\S/.test(l)) break; // left paths
      const p = l.match(/^  (\/\S+):$/);
      if (p) {
        path = p[1]!;
        continue;
      }
      const meth = l.match(/^    (get|post|put|patch|delete):$/);
      if (meth && path) {
        // summary is within the next few lines of this method
        let summary = "";
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const s = lines[j]!.match(/^      summary:\s*(.*)$/);
          if (s) {
            summary = s[1]!.replace(/^["']|["']$/g, "");
            break;
          }
          if (/^    \S/.test(lines[j]!)) break;
        }
        endpoints.push({ method: meth[1]!.toUpperCase(), path, summary });
      }
    }
  }

  return { schemas, endpoints };
}

/** Names of schemas directly referenced ($ref) inside a block, for one-level expansion. */
function refsIn(block: string): string[] {
  return [...block.matchAll(/\$ref:\s*['"]?#\/components\/schemas\/([A-Za-z0-9_]+)/g)].map((m) => m[1]!);
}

/** Query the index: return matching endpoints + schema blocks (with one-level refs). */
export function queryOpenApi(index: OpenApiIndex, query: string, maxBytes: number): string {
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);

  // Candidate schemas: synonyms first, then substring matches on names.
  const wanted = new Set<string>();
  for (const [k, names] of Object.entries(SYNONYMS)) {
    if (q.includes(k)) names.forEach((n) => index.schemas.has(n) && wanted.add(n));
  }
  for (const name of index.schemas.keys()) {
    if (tokens.some((t) => name.toLowerCase().includes(t))) wanted.add(name);
  }
  const primary = [...wanted].slice(0, 4);
  // Pull in one level of referenced schemas so composed shapes are complete.
  const expanded = new Set(primary);
  for (const n of primary) {
    const block = index.schemas.get(n);
    if (block) refsIn(block).forEach((r) => index.schemas.has(r) && expanded.add(r));
  }

  const endpoints = index.endpoints
    .filter((e) => tokens.some((t) => e.path.toLowerCase().includes(t) || e.summary.toLowerCase().includes(t)))
    .slice(0, 15);

  const parts: string[] = [];
  if (endpoints.length) {
    parts.push("## Endpoints\n" + endpoints.map((e) => `${e.method} ${e.path} — ${e.summary}`).join("\n"));
  }
  let budget = maxBytes;
  const schemaTexts: string[] = [];
  for (const n of expanded) {
    const block = index.schemas.get(n);
    if (!block) continue;
    if (block.length > budget) break;
    budget -= block.length;
    schemaTexts.push(block);
  }
  if (schemaTexts.length) parts.push("## Schemas\n```yaml\n" + schemaTexts.join("\n") + "\n```");

  return parts.join("\n\n");
}

// ── fetch + cache ────────────────────────────────────────────────────────────

let cache: { index: OpenApiIndex; atMs: number } | null = null;
let inflight: Promise<OpenApiIndex> | null = null;

async function getIndex(): Promise<OpenApiIndex> {
  const ttlMs = loadConfig().DOCS_CACHE_TTL_SEC * 1000;
  if (cache && Date.now() - cache.atMs < ttlMs) return cache.index;
  if (!inflight) {
    inflight = fetch(OPENAPI_URL, { headers: { "User-Agent": "netbird-assistant" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`openapi fetch ${res.status}`);
        const index = indexOpenApi(await res.text());
        cache = { index, atMs: Date.now() };
        return index;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Execute the get_api_reference tool. */
export async function runApiTool(input: unknown): Promise<ServerToolResult> {
  const query = (input as { query?: unknown })?.query;
  if (typeof query !== "string" || !query.trim()) {
    return { ok: false, content: "invalid input: get_api_reference needs a `query`.", summary: "api query rejected" };
  }
  try {
    const index = await getIndex();
    const body = queryOpenApi(index, query, loadConfig().DOCS_FETCH_MAX_BYTES);
    if (!body) {
      return { ok: true, content: `No API endpoints or schemas matched "${query}".`, summary: `No API match for "${query}"` };
    }
    return { ok: true, content: `NetBird API reference for "${query}":\n\n${body}`, summary: `API reference: "${query}"` };
  } catch {
    return { ok: false, content: "Could not load the API reference right now.", summary: "API reference unavailable" };
  }
}

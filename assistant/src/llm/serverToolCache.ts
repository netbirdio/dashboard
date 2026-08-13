/**
 * Shared, TTL-bounded cache for PUBLIC server-tool results. Keyed only by tool
 * name + input (no account/user), so a result computed for one customer serves
 * the next customer that asks the same thing — safe ONLY because these tools
 * return public, non-user-specific data.
 *
 * `CACHEABLE_TOOLS` is an allowlist: the docs/API tools. Management (client) tools
 * never reach this server and must never be cached (that would leak one account's
 * data to another). render_component is excluded too — it's per-call UI, not data.
 */

/** Public server tools whose output may be shared across customers. */
export const CACHEABLE_TOOLS: ReadonlySet<string> = new Set([
  "search_docs",
  "fetch_doc",
  "get_api_reference",
]);

/** Deterministic key for a tool call: object keys sorted so ordering can't miss. */
export function stableKey(name: string, input: unknown): string {
  return `${name}:${stableStringify(input)}`;
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/** A small in-memory cache with per-entry TTL and FIFO eviction at capacity. */
export class TtlCache<T> {
  private map = new Map<string, { value: T; atMs: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly max: number,
  ) {}

  get(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() - e.atMs >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T): void {
    if (this.map.size >= this.max && !this.map.has(key)) {
      const oldest = this.map.keys().next().value; // Map preserves insertion order
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, atMs: Date.now() });
  }

  get size(): number {
    return this.map.size;
  }
}

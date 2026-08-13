import { test, expect } from "bun:test";
import { TtlCache, stableKey, CACHEABLE_TOOLS } from "@/llm/serverToolCache.ts";
import { isServerTool } from "@/llm/tools.ts";

test("TtlCache stores and returns values within the TTL", () => {
  const c = new TtlCache<number>(10_000, 10);
  c.set("a", 1);
  expect(c.get("a")).toBe(1);
  expect(c.get("missing")).toBeUndefined();
});

test("TtlCache expires entries past the TTL", () => {
  const c = new TtlCache<number>(0, 10); // ttl 0 → any elapsed time is expired
  c.set("a", 1);
  expect(c.get("a")).toBeUndefined();
});

test("TtlCache evicts the oldest entry at capacity (FIFO)", () => {
  const c = new TtlCache<number>(10_000, 2);
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3); // evicts "a"
  expect(c.get("a")).toBeUndefined();
  expect(c.get("b")).toBe(2);
  expect(c.get("c")).toBe(3);
  expect(c.size).toBe(2);
});

test("stableKey is order-independent for object inputs", () => {
  expect(stableKey("fetch_doc", { url: "u", n: 1 })).toBe(stableKey("fetch_doc", { n: 1, url: "u" }));
  expect(stableKey("search_docs", { query: "a" })).not.toBe(stableKey("search_docs", { query: "b" }));
});

test("only public docs/API tools are cacheable; management + render are not", () => {
  expect([...CACHEABLE_TOOLS].sort()).toEqual(["fetch_doc", "get_api_reference", "search_docs"]);
  // safety: everything cacheable is a server tool; no client/management tool leaks in
  for (const name of CACHEABLE_TOOLS) expect(isServerTool(name)).toBe(true);
  expect(CACHEABLE_TOOLS.has("render_component")).toBe(false);
  expect(CACHEABLE_TOOLS.has("list_peers")).toBe(false); // per-account data — never shared
});

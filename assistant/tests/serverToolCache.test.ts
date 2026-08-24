import { expect, test } from "bun:test";
import { CACHEABLE_TOOLS, stableKey } from "@/agent/tools/registry.ts";
import { isServerTool } from "@/agent/tools/registry.ts";

test("stableKey is order-independent for object inputs", () => {
  expect(stableKey("fetch_doc", { url: "u", n: 1 })).toBe(stableKey("fetch_doc", { n: 1, url: "u" }));
  expect(stableKey("search_docs", { query: "a" })).not.toBe(stableKey("search_docs", { query: "b" }));
});

test("only public docs/API tools are cacheable; management + render are not", () => {
  expect([...CACHEABLE_TOOLS].sort()).toEqual(["fetch_doc", "get_api_reference", "search_docs"]);

  for (const name of CACHEABLE_TOOLS) expect(isServerTool(name)).toBe(true);
  expect(CACHEABLE_TOOLS.has("render_component")).toBe(false);
  expect(CACHEABLE_TOOLS.has("list_peers")).toBe(false);
});

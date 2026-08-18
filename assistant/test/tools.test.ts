import { test, expect, beforeAll } from "bun:test";
import { setEnv } from "./env.ts";
import { buildToolSet, TOOLS } from "@/tools/index.ts";

beforeAll(() => setEnv());

test("every v1 tool has a complete spec", () => {
  for (const { spec } of Object.values(TOOLS)) {
    expect(spec.name).toBeTruthy();
    expect(spec.description.length).toBeGreaterThan(10);
    expect(spec.inputSchema).toHaveProperty("type", "object");
  }
  expect("list_peers" in TOOLS).toBe(true);
  expect("delete_everything" in TOOLS).toBe(false);
});

test("buildToolSet gives server tools an execute and leaves client tools to the dashboard", () => {
  const set = buildToolSet();
  expect(Object.keys(set).length).toBe(Object.keys(TOOLS).length);
  expect(set.search_docs?.execute).toBeDefined();
  expect(set.ask_user?.execute).toBeDefined();
  expect(set.render_component?.execute).toBeDefined();
  expect(set.list_peers?.execute).toBeUndefined();
  expect(set.cc_add?.execute).toBeUndefined();
});

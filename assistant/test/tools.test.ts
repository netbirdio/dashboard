import { test, expect } from "bun:test";
import { TOOLS, toolSpecs, isKnownTool, isMutating } from "@/llm/tools.ts";
import { vetToolUses } from "@/guardrails/output.ts";
import type { LlmContentBlock } from "@/types.ts";

test("every v1 tool is read-only and has a complete spec", () => {
  const specs = toolSpecs();
  expect(specs.length).toBe(Object.keys(TOOLS).length);
  for (const s of specs) {
    expect(s.name).toBeTruthy();
    expect(s.description.length).toBeGreaterThan(10);
    expect(s.inputSchema).toHaveProperty("type", "object");
  }
  expect(Object.values(TOOLS).every((t) => t.mutating === false)).toBe(true);
});

test("isKnownTool / isMutating reflect the registry", () => {
  expect(isKnownTool("list_peers")).toBe(true);
  expect(isKnownTool("delete_everything")).toBe(false);
  expect(isMutating("list_peers")).toBe(false);
  expect(isMutating("unknown")).toBe(false);
});

test("vetToolUses allows known tools, denies unknown, and ignores text", () => {
  const content: LlmContentBlock[] = [
    { type: "text", text: "sure" },
    { type: "tool_use", id: "t1", name: "list_peers", input: {} },
    { type: "tool_use", id: "t2", name: "rm_rf", input: {} },
  ];
  const decisions = vetToolUses(content);
  expect(decisions).toEqual([
    { toolUseId: "t1", name: "list_peers", allowed: true, mutating: false },
    { toolUseId: "t2", name: "rm_rf", allowed: false, mutating: false },
  ]);
});

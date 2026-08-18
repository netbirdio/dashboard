import { test, expect, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { supportsAdaptiveThinking, supportsEffort } from "@/llm.ts";

beforeEach(() => setEnv());

test("supportsEffort keeps effort for current models and drops it for the cheap tiers", () => {
  expect(supportsEffort("claude-opus-4-8")).toBe(true);
  expect(supportsEffort("claude-opus-5")).toBe(true);
  expect(supportsEffort("claude-sonnet-5")).toBe(true);

  expect(supportsEffort("claude-haiku-4-5")).toBe(false);
  expect(supportsEffort("claude-haiku-4-5-20251001")).toBe(false);
  expect(supportsEffort("claude-sonnet-4-5")).toBe(false);

  expect(supportsEffort("claude-something-6")).toBe(true);
});

test("supportsAdaptiveThinking mirrors the generation cut-off", () => {
  expect(supportsAdaptiveThinking("claude-sonnet-5")).toBe(true);
  expect(supportsAdaptiveThinking("claude-opus-4-8")).toBe(true);
  expect(supportsAdaptiveThinking("claude-haiku-4-5")).toBe(false);
  expect(supportsAdaptiveThinking("claude-3-5-sonnet-20241022")).toBe(false);
});

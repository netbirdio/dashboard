import { test, expect, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { selectableModels, isSelectableModel , supportsAdaptiveThinking, supportsEffort } from "@/llm/models.ts";
import { validateChatRequest } from "@/guardrails/input.ts";

beforeEach(() => setEnv());

test("main model is always selectable and marked default", () => {
  setEnv({ LLM_MAIN_MODEL: "claude-opus-4-8", LLM_SELECTABLE_MODELS: "" });
  const models = selectableModels();
  expect(models).toEqual([{ id: "claude-opus-4-8", default: true }]);
  expect(isSelectableModel("claude-opus-4-8")).toBe(true);
  expect(isSelectableModel("gpt-4")).toBe(false);
});

test("allowlist is honored and main is prepended if absent", () => {
  setEnv({ LLM_MAIN_MODEL: "claude-opus-4-8", LLM_SELECTABLE_MODELS: "claude-sonnet-5,claude-haiku-4-5" });
  const ids = selectableModels().map((m) => m.id);
  expect(ids[0]).toBe("claude-opus-4-8"); // default first
  expect(ids).toContain("claude-sonnet-5");
  expect(selectableModels().filter((m) => m.default)).toHaveLength(1);
  expect(isSelectableModel("claude-sonnet-5")).toBe(true);
});

test("chat request rejects a model outside the allowlist", () => {
  setEnv({ LLM_SELECTABLE_MODELS: "claude-sonnet-5" });
  const body = { messages: [{ role: "user", content: "hi" }], model: "evil-model" };
  const res = validateChatRequest(body, 100);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.status).toBe(400);
});

test("chat request accepts an allowlisted model and omitting it", () => {
  setEnv({ LLM_SELECTABLE_MODELS: "claude-sonnet-5" });
  expect(validateChatRequest({ messages: [{ role: "user", content: "hi" }], model: "claude-sonnet-5" }, 100).ok).toBe(true);
  expect(validateChatRequest({ messages: [{ role: "user", content: "hi" }] }, 100).ok).toBe(true);
});

test("supportsEffort keeps effort for current models and drops it for the cheap tiers", () => {
  // Effort arrived with the Opus 4.5/4.6 generation.
  expect(supportsEffort("claude-opus-4-8")).toBe(true);
  expect(supportsEffort("claude-opus-5")).toBe(true);
  expect(supportsEffort("claude-sonnet-5")).toBe(true);

  // These 400 on effort — a Haiku deployment would fail every chat turn.
  expect(supportsEffort("claude-haiku-4-5")).toBe(false);
  expect(supportsEffort("claude-haiku-4-5-20251001")).toBe(false);
  expect(supportsEffort("claude-sonnet-4-5")).toBe(false);

  // An id we don't recognise is assumed current, so a newer model keeps effort.
  expect(supportsEffort("claude-something-6")).toBe(true);
});

test("adaptive thinking follows the same generation cutoff as effort", () => {
  expect(supportsAdaptiveThinking("claude-sonnet-5")).toBe(true);
  expect(supportsAdaptiveThinking("claude-opus-4-8")).toBe(true);
  // Haiku 4.5 takes a budget_tokens budget instead — sending adaptive 400s.
  expect(supportsAdaptiveThinking("claude-haiku-4-5")).toBe(false);
});

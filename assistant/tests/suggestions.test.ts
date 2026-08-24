import { MockLanguageModelV3 } from "ai/test";
import { afterAll, beforeEach, expect, test } from "bun:test";
import {
  generateSuggestions,
  normalizeSuggestions,
  type Suggestions,
} from "@/agent/suggestions.ts";
import { setEnv } from "./env.ts";

const EMPTY: Suggestions = { quick_replies: [], question: "" };

// The fast model, handed to generateSuggestions directly: mocking the provider
// package here would collide with the chat turn tests, which already do.
function respondsWith(text: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage: {
        inputTokens: { total: 30, noCache: 30, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 9, text: 9, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

const realError = console.error;

beforeEach(() => {
  setEnv({ SUGGESTIONS_ENABLED: "true" });
  console.error = () => {};
});

afterAll(() => {
  console.error = realError;
});

test("normalizeSuggestions trims, dedupes, and clamps", () => {
  const s = normalizeSuggestions(
    { quick_replies: ["Yes", " Yes ", "No", "Maybe", "Extra one"], question: "Enable it now?" },
    3,
  );
  expect(s.quick_replies).toEqual(["Yes", "No", "Maybe"]);
  expect(s.question).toBe("Enable it now?");
});

// A title with no buttons under it is worse than no title.
test("normalizeSuggestions drops a question with no quick replies", () => {
  expect(normalizeSuggestions({ quick_replies: [], question: "Which one?" }, 3)).toEqual(EMPTY);
  expect(normalizeSuggestions({ quick_replies: ["  "], question: "Which one?" }, 3)).toEqual(EMPTY);
});

test("normalizeSuggestions clamps a runaway question", () => {
  const s = normalizeSuggestions({ quick_replies: ["Yes"], question: "q".repeat(400) }, 3);
  expect(s.question).toHaveLength(160);
});

test("a schema-shaped reply becomes suggestions, with the call's usage", async () => {
  const model = respondsWith('{"quick_replies":["Yes","Yes","No"],"question":"Enable it now?"}');

  const { suggestions, usage } = await generateSuggestions(
    "enable dns?",
    "Want me to enable it?",
    model,
  );
  expect(suggestions).toEqual({ quick_replies: ["Yes", "No"], question: "Enable it now?" });
  expect(usage).toMatchObject({ inputTokens: 30, outputTokens: 9, totalTokens: 39 });
});

// Fails open: the answer is already streaming when this runs.
test("output the schema rejects yields no suggestions instead of throwing", async () => {
  for (const reply of [
    "no json here",
    '```json\n{"quick_replies":[]}\n```',
    '{"quick_replies":"nope","question":42}',
    '{"quick_replies":["Ye',
  ]) {
    const { suggestions, usage } = await generateSuggestions("hi", "hello", respondsWith(reply));
    expect(suggestions).toEqual(EMPTY);
    expect(usage).toBeUndefined();
  }
});

test("the model is never called when suggestions are off, or there is nothing to work with", async () => {
  const model = new MockLanguageModelV3({
    doGenerate: () => {
      throw new Error("the fast model must not be called here");
    },
  });

  setEnv({ SUGGESTIONS_ENABLED: "false" });
  expect((await generateSuggestions("hi", "hello", model)).suggestions).toEqual(EMPTY);

  setEnv({ SUGGESTIONS_ENABLED: "true" });
  expect((await generateSuggestions("", "", model)).suggestions).toEqual(EMPTY);
});

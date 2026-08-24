import { generateText, type LanguageModel, type LanguageModelUsage, Output } from "ai";
import { z } from "zod";
import { anthropic } from "@/agent/model.ts";
import { loadConfig } from "@/config.ts";

export interface Suggestions {
  quick_replies: string[];
  question: string;
}

export interface SuggestionsResult {
  suggestions: Suggestions;
  // Absent when the call was skipped or failed. The caller logs it: a fast
  // model on every answered turn is small per turn and not small per month.
  usage?: LanguageModelUsage;
}

const EMPTY: Suggestions = { quick_replies: [], question: "" };

const SUGGESTIONS_MAX = 3;
const QUESTION_MAX_CHARS = 160;

// The shape is enforced by the schema, so the prompt only has to say what the
// two fields mean.
const SuggestionsSchema = z.object({
  quick_replies: z.array(z.string()),
  question: z.string(),
});

const SYSTEM = `You turn a question the NetBird dashboard assistant just asked into tappable answers. Given the last exchange:
- quick_replies: up to {N} short, distinct answers to the assistant's message — ONLY if it actually asked the user something or offered a choice. If its message was a statement, an answer, or a refusal, return an empty array. Most messages are not questions; an empty array is the common, correct output.
- question: the assistant's question in one short line (≤ 12 words) when quick_replies is non-empty; otherwise an empty string.
Never invent things for the user to ask next.`;

// The model honours the schema, not the house rules: it still over-produces,
// repeats itself, and titles a list it did not fill.
export function normalizeSuggestions(raw: Suggestions, max: number): Suggestions {
  const quick_replies = raw.quick_replies
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, a) => a.indexOf(s) === i)
    .slice(0, max);
  return {
    quick_replies,
    question: quick_replies.length ? raw.question.trim().slice(0, QUESTION_MAX_CHARS) : "",
  };
}

export async function generateSuggestions(
  lastUser: string,
  assistantText: string,
  // Injectable because chat.ts and this module share one SDK provider factory,
  // and two test files cannot mock that package independently.
  model?: LanguageModel,
): Promise<SuggestionsResult> {
  const cfg = loadConfig();
  if (!cfg.SUGGESTIONS_ENABLED) return { suggestions: EMPTY };
  if (!lastUser && !assistantText) return { suggestions: EMPTY };

  try {
    const res = await generateText({
      model: model ?? anthropic()(cfg.LLM_FAST_MODEL),
      system: SYSTEM.replaceAll("{N}", String(SUGGESTIONS_MAX)),
      prompt: `User asked:\n${lastUser}\n\nAssistant answered:\n${assistantText}`,
      maxOutputTokens: 256,
      output: Output.object({ schema: SuggestionsSchema }),
    });
    return { suggestions: normalizeSuggestions(res.output, SUGGESTIONS_MAX), usage: res.usage };
  } catch (err) {
    // Fails open, including on output the schema rejects: the answer is already
    // streaming, and a missing row of buttons must not break it.
    console.error("suggestions failed:", (err as Error).message);
    return { suggestions: EMPTY };
  }
}

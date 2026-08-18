import { generateText } from "ai";
import { loadConfig } from "@/config.ts";
import type { MutableCtx } from "@/types.ts";
import { anthropic, toUsage } from "@/llm.ts";
import { record } from "@/db/index.ts";
import { countSuggestions, observeLlm } from "@/instrumentation/metrics.ts";

export interface Suggestions {
  quick_replies: string[];
  question: string;
}

const EMPTY: Suggestions = { quick_replies: [], question: "" };

const SUGGESTIONS_MAX = 3;

const SYSTEM = `You turn a question the NetBird dashboard assistant just asked into tappable answers. Given the last exchange, return STRICT JSON and nothing else:
{"quick_replies": string[], "question": string}
- quick_replies: up to {N} short, distinct answers to the assistant's message — ONLY if it actually asked the user something or offered a choice. If its message was a statement, an answer, or a refusal, return an empty array. Most messages are not questions; an empty array is the common, correct output.
- question: the assistant's question in one short line (≤ 12 words) when quick_replies is non-empty; otherwise an empty string.
Never invent things for the user to ask next. Output ONLY the JSON object — no prose, no code fences.`;

export function parseSuggestions(raw: string, max: number): Suggestions {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return EMPTY;
  let obj: unknown;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return EMPTY;
  }
  const clean = (v: unknown): string[] =>
    (Array.isArray(v) ? v : [])
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s, i, a) => a.indexOf(s) === i)
      .slice(0, max);
  const rec = obj as Record<string, unknown>;
  const quick_replies = clean(rec.quick_replies);
  const question = typeof rec.question === "string" ? rec.question.trim().slice(0, 160) : "";
  return {
    quick_replies,

    question: quick_replies.length ? question : "",
  };
}

export async function generateSuggestions(
  lastUser: string,
  assistantText: string,
  ctx?: MutableCtx,
): Promise<Suggestions> {
  const cfg = loadConfig();
  if (!cfg.SUGGESTIONS_ENABLED) return EMPTY;
  if (!lastUser && !assistantText) return EMPTY;

  const start = performance.now();
  try {
    const res = await generateText({
      model: anthropic()(cfg.LLM_FAST_MODEL),
      system: SYSTEM.replaceAll("{N}", String(SUGGESTIONS_MAX)),
      prompt: `User asked:\n${lastUser}\n\nAssistant answered:\n${assistantText}`,
      maxOutputTokens: 256,
    });
    const durationSec = (performance.now() - start) / 1000;
    const usage = toUsage(res.usage);
    observeLlm({
      provider: "anthropic",
      model: cfg.LLM_FAST_MODEL,
      tier: "fast",
      task: "suggestions",
      status: "ok",
      durationSec,
      usage,
    });
    if (ctx?.principal) {
      record({
        requestId: ctx.requestId,
        conversationId: ctx.conversationId,
        accountId: ctx.principal.accountId,
        userId: ctx.principal.userId,
        provider: "anthropic",
        model: cfg.LLM_FAST_MODEL,
        task: "suggestions",
        usage,
        latencyMs: Math.round(durationSec * 1000),
        stopReason: null,
        toolCallsRequested: 0,
        createdAt: new Date(),
      });
    }
    const parsed = parseSuggestions(res.text, SUGGESTIONS_MAX);
    countSuggestions(parsed.quick_replies.length ? "emitted" : "empty");
    return parsed;
  } catch (err) {
    console.error("suggestions failed:", (err as Error).message);
    countSuggestions("error");
    observeLlm({
      provider: "anthropic",
      model: cfg.LLM_FAST_MODEL,
      tier: "fast",
      task: "suggestions",
      status: "error",
      durationSec: (performance.now() - start) / 1000,
    });
    return EMPTY;
  }
}

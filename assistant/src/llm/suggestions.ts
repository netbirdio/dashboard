/**
 * Quick replies. When the assistant's answer ends in a question, a cheap
 * fast-tier call turns it into a couple of tappable answers, emitted as a
 * `suggestions` SSE event so the expensive main model's answer stays clean.
 *
 * It deliberately does *not* propose "what you might ask next". That fired after
 * every single answer, including ones where the user was told no, and a card of
 * invented next steps under every reply is noise the user has to look past to
 * read the answer. If they know what to ask next, they'll ask.
 *
 * Fail-soft by design: any error (or the classifier being disabled) yields
 * nothing — this must never block or break a chat response. `parseSuggestions`
 * is pure and unit-tested.
 */
import { loadConfig } from "@/config.ts";
import { providerFor } from "@/llm/registry.ts";
import { countSuggestions, observeLlm } from "@/telemetry/metrics.ts";
import { record } from "@/telemetry/store.ts";
import type { MutableCtx } from "@/http/compose.ts";
import type { LlmContentBlock, LlmMessage } from "@/types.ts";

export interface Suggestions {
  /** Short answers to the assistant's last question; empty if it didn't ask one. */
  quick_replies: string[];
  /**
   * The assistant's own question, restated in one line — the title of the card
   * the quick replies are shown in. Empty when it didn't ask anything.
   */
  question: string;
}

const EMPTY: Suggestions = { quick_replies: [], question: "" };

const SYSTEM = `You turn a question the NetBird dashboard assistant just asked into tappable answers. Given the last exchange, return STRICT JSON and nothing else:
{"quick_replies": string[], "question": string}
- quick_replies: up to {N} short, distinct answers to the assistant's message — ONLY if it actually asked the user something or offered a choice. If its message was a statement, an answer, or a refusal, return an empty array. Most messages are not questions; an empty array is the common, correct output.
- question: the assistant's question in one short line (≤ 12 words) when quick_replies is non-empty; otherwise an empty string.
Never invent things for the user to ask next. Output ONLY the JSON object — no prose, no code fences.`;

function textOf(content: string | LlmContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join(" ")
    .trim();
}

function lastUserText(messages: LlmMessage[]): string {
  const msg = [...messages].reverse().find((m) => m.role === "user");
  return msg ? textOf(msg.content) : "";
}

/** Extract, parse, and sanitize the model's JSON. Tolerant of stray prose/fences. */
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
      .filter((s, i, a) => a.indexOf(s) === i) // dedupe
      .slice(0, max);
  const rec = obj as Record<string, unknown>;
  const quick_replies = clean(rec.quick_replies);
  const question = typeof rec.question === "string" ? rec.question.trim().slice(0, 160) : "";
  return {
    quick_replies,
    // A title with nothing to title is noise the frontend would have to ignore.
    question: quick_replies.length ? question : "",
  };
}

/**
 * Generate suggestion chips for the just-completed turn. `assistantText` is the
 * final answer text; `messages` is the transcript the caller sent. Only a compact
 * tail is sent to the fast model to keep the call cheap. `ctx` is for attribution
 * only — cheap is not free, and these tokens belong in the account's total.
 */
export async function generateSuggestions(
  messages: LlmMessage[],
  assistantText: string,
  ctx?: MutableCtx,
): Promise<Suggestions> {
  const cfg = loadConfig();
  if (!cfg.SUGGESTIONS_ENABLED) return EMPTY;
  const lastUser = lastUserText(messages);
  if (!lastUser && !assistantText) return EMPTY;

  const start = performance.now();
  try {
    const { provider, model } = providerFor("fast");
    const res = await provider.complete({
      model,
      maxTokens: 256,
      system: SYSTEM.replaceAll("{N}", String(cfg.SUGGESTIONS_MAX)),
      messages: [
        {
          role: "user",
          content: `User asked:\n${lastUser}\n\nAssistant answered:\n${assistantText}`,
        },
      ],
    });
    const durationSec = (performance.now() - start) / 1000;
    observeLlm({
      provider: provider.name,
      model: res.model,
      tier: "fast",
      task: "suggestions",
      status: "ok",
      durationSec,
      usage: res.usage,
    });
    if (ctx?.principal) {
      record({
        requestId: ctx.requestId,
        conversationId: ctx.conversationId,
        accountId: ctx.principal.accountId,
        userId: ctx.principal.userId,
        provider: provider.name,
        model: res.model,
        task: "suggestions",
        usage: res.usage,
        latencyMs: Math.round(durationSec * 1000),
        stopReason: null,
        toolCallsRequested: 0,
        createdAt: new Date(),
      });
    }
    const parsed = parseSuggestions(res.text, cfg.SUGGESTIONS_MAX);
    countSuggestions(parsed.quick_replies.length ? "emitted" : "empty");
    return parsed;
  } catch (err) {
    // Fail-soft: suggestions are a nicety, never a reason to fail the response.
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

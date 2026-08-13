/**
 * Reads the "what went wrong" signals off an incoming turn and files them.
 *
 * The transcript the caller resends is the whole source: a step that failed in the
 * browser comes back as a `tool_result` with `is_error`, and the message the user
 * typed comes back as text. So this needs no endpoint of its own, adds nothing to
 * the response path, and works for the client-executed tools the server never runs.
 *
 * Only the NEWEST turn is counted. The transcript is replayed in full on every
 * request, so counting all of it would re-count the same failure once per
 * following turn — the shape of bug that makes a dashboard confidently wrong.
 */
import { countToolFailure, countUserSentiment } from "@/telemetry/metrics.ts";
import {
  classifyToolFailure,
  detectSentiment,
} from "@/telemetry/signals.ts";
import type { ChatMessage, LlmContentBlock } from "@/types.ts";

/** Longest `detail` logged: enough to recognise the message, not a transcript. */
const DETAIL_MAX = 400;

export interface SignalContext {
  requestId: string;
  conversationId?: string;
  accountId: string;
  userId: string;
  model?: string;
  now: Date;
}

/** Name of the tool a `tool_use` block used, by id, for labelling its result. */
function toolNamesById(messages: ChatMessage[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const message of messages) {
    if (typeof message.content === "string") continue;
    for (const block of message.content) {
      if (block.type === "tool_use") names.set(block.id, block.name);
    }
  }
  return names;
}

/**
 * The blocks of the last message, when it's the one carrying this turn's news:
 * either the user's text or the tool results from the steps just executed.
 */
function newestBlocks(messages: ChatMessage[]): {
  text: string;
  results: Extract<LlmContentBlock, { type: "tool_result" }>[];
} {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return { text: "", results: [] };
  if (typeof last.content === "string") return { text: last.content, results: [] };

  const results: Extract<LlmContentBlock, { type: "tool_result" }>[] = [];
  let text = "";
  for (const block of last.content) {
    if (block.type === "tool_result") results.push(block);
    else if (block.type === "text") text += `${block.text}\n`;
  }
  return { text, results };
}

/**
 * Count this turn's signals. Never throws: telemetry that can break a chat turn
 * is worse than no telemetry.
 *
 * A tool failure also goes to stdout with the message the tool gave the model —
 * the counter says a reason got more common, the log line says what it looked
 * like. Sentiment is counted only: the kind is the signal, and keeping what
 * someone typed in anger is not measurement.
 */
export function collectTurnSignals(
  messages: ChatMessage[],
  ctx: SignalContext,
): void {
  try {
    const { text, results } = newestBlocks(messages);
    const names = toolNamesById(messages);

    for (const result of results) {
      if (!result.isError) continue;
      const tool = names.get(result.toolUseId) ?? "unknown";
      const reason = classifyToolFailure(result.content);
      countToolFailure(tool, reason);
      console.warn(
        JSON.stringify({
          event: "tool_failure",
          requestId: ctx.requestId,
          conversationId: ctx.conversationId,
          accountId: ctx.accountId,
          userId: ctx.userId,
          tool,
          reason,
          model: ctx.model,
          // Already pseudonymised (caller) and scrubbed (vault) — tokens, not names.
          detail: result.content.slice(0, DETAIL_MAX),
        }),
      );
    }

    for (const kind of detectSentiment(text)) {
      countUserSentiment(kind);
    }
  } catch (err) {
    console.error("turn signal collection failed:", (err as Error).message);
  }
}

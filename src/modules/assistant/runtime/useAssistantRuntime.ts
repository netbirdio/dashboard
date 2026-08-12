/**
 * assistant-ui runtime for the NetBird assistant.
 *
 * The agent loop spans caller + server across HTTP turns: each `POST /v1/chat`
 * is one streamed model turn, and when the model asks for a management tool the
 * server ends its turn so we can execute it. assistant-ui's `ChatModelAdapter`
 * models a turn as one async generator, so we drive that whole loop inside a
 * single `run()` — yielding accumulated content parts as they arrive, and
 * re-POSTing until the server answers without a tool call.
 *
 * The transcript is derived from assistant-ui's own message list on every run
 * rather than kept in a ref, so editing or branching a message stays correct.
 * The one thing we deliberately don't persist is the server's `appendMessages`
 * (intermediate documentation turns): they only need to be consistent within a
 * single HTTP turn sequence, which is exactly the scope of one `run()`.
 */
"use client";

import {
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ChatModelRunResult,
  type FeedbackAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePart,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useNetBirdFetch } from "@utils/api";
import { useCallback, useMemo, useRef } from "react";
import type { ChatEvent } from "../assistantApi";
import {
  AssistantStreamError,
  describeAssistantError,
  streamChat,
} from "../assistantApi";
import loadAssistantConfig from "../assistantConfig";
import type { AssistantQuestion } from "../components/QuestionCard";
import type { Redactor } from "../privacy/redaction";
import { type CatalogEntry, rewriteNames } from "../privacy/rewriteNames";
import { isClientTool } from "../tools/clientTools";
import { type ToolSession, useToolExecutor } from "../tools/useToolExecutor";
import type { ChatMessage, LlmContentBlock } from "../types";

/**
 * Swap resource names the user typed for their tokens, everywhere in the
 * transcript. Applied to the wire copy only — the thread keeps what they
 * actually wrote, so the bubble still says "eduards-macbook".
 *
 * Every user turn, not just the newest: the transcript is rebuilt from the
 * thread on each run, so an earlier message would otherwise go back out with
 * its names intact.
 */
function withResolvedNames(
  wire: ChatMessage[],
  catalog: CatalogEntry[],
  redactor: Redactor,
): ChatMessage[] {
  if (catalog.length === 0) return wire;

  return wire.map((message) =>
    message.role === "user" && typeof message.content === "string"
      ? {
          ...message,
          content: rewriteNames(message.content, catalog, redactor),
        }
      : message,
  );
}

/**
 * Attach the page context to the turn the user just sent.
 *
 * It rides on the last user message rather than as a message of its own: the
 * Messages API wants alternating roles, and a context line is not a turn — it's
 * a note about the one being sent. Invisible in the thread, which builds its
 * bubbles from its own state, not from this.
 */
function withPageContext(
  wire: ChatMessage[],
  context: string | null,
): ChatMessage[] {
  if (!context) return wire;

  const index = wire.map((m) => m.role).lastIndexOf("user");
  const message = wire[index];
  if (!message || typeof message.content !== "string") return wire;

  const next = [...wire];
  next[index] = { ...message, content: `${context}\n\n${message.content}` };
  return next;
}

/**
 * Safety net on the caller side of the loop. The server caps its own internal
 * doc iterations; this bounds how many times *we* will round-trip on management
 * tools before giving up, so a model that keeps asking can't spin forever.
 */
const MAX_TOOL_TURNS = 8;

/** Synthetic tool name used to carry an inline `component` event as a part. */
export const COMPONENT_PART = "netbird_component";

// ── transcript conversion ────────────────────────────────────────────────────

const textOf = (message: ThreadMessage): string =>
  message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

/**
 * assistant-ui messages → the server's `messages[]`.
 *
 * An assistant message that called tools becomes two wire messages: the
 * assistant turn carrying `tool_use` blocks, then a user turn carrying the
 * matching `tool_result` blocks (which is how the Messages API expects them).
 */
function toWireMessages(messages: readonly ThreadMessage[]): ChatMessage[] {
  const wire: ChatMessage[] = [];

  for (const message of messages) {
    if (message.role === "system") continue;

    if (message.role === "user") {
      const text = textOf(message);
      if (text) wire.push({ role: "user", content: text });
      continue;
    }

    const blocks: LlmContentBlock[] = [];
    const results: LlmContentBlock[] = [];

    for (const part of message.content) {
      if (part.type === "text" && part.text) {
        blocks.push({ type: "text", text: part.text });
        continue;
      }
      if (part.type !== "tool-call") continue;

      // Server-run tools and inline components are the server's business; it
      // reconstructs them itself and they must not reappear as client calls.
      if (part.toolName === COMPONENT_PART || !isClientTool(part.toolName)) {
        continue;
      }
      // A call with no result never completed (aborted turn) — replaying the
      // tool_use without its tool_result would make the transcript invalid.
      if (part.result === undefined) continue;

      blocks.push({
        type: "tool_use",
        id: part.toolCallId,
        name: part.toolName,
        input: part.args ?? {},
      });
      results.push({
        type: "tool_result",
        toolUseId: part.toolCallId,
        content: String(part.result),
        isError: part.isError === true,
      });
    }

    if (blocks.length) wire.push({ role: "assistant", content: blocks });
    if (results.length) wire.push({ role: "user", content: results });
  }

  return wire;
}

// ── part accumulation ────────────────────────────────────────────────────────

/**
 * Builds the assistant message incrementally. Text deltas append to the trailing
 * text part; tool activity and components become `tool-call` parts so they can be
 * rendered in place, in the order they actually happened.
 */
class PartBuilder {
  private parts: ThreadAssistantMessagePart[] = [];

  snapshot(): ChatModelRunResult {
    // Copy — assistant-ui holds onto what we yield.
    return { content: [...this.parts] };
  }

  appendText(delta: string): void {
    const last = this.parts[this.parts.length - 1];
    if (last?.type === "text") {
      this.parts[this.parts.length - 1] = { ...last, text: last.text + delta };
    } else {
      this.parts.push({ type: "text", text: delta });
    }
  }

  /**
   * The model's thinking, accumulated into a `reasoning` part. Only the text is
   * kept: the signed block the next request needs travels separately, in the
   * `tool_use` event's `content` the server hands back.
   */
  appendReasoning(delta: string): void {
    const last = this.parts[this.parts.length - 1];
    if (last?.type === "reasoning") {
      this.parts[this.parts.length - 1] = { ...last, text: last.text + delta };
    } else {
      this.parts.push({ type: "reasoning", text: delta });
    }
  }

  /** Replace streamed text with the server's authoritative final text. Leaves
   *  reasoning and tool parts alone — they're not part of the answer body. */
  replaceText(content: LlmContentBlock[]): void {
    const finalText = content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    if (!finalText) return;

    /*
      Almost always a no-op, and that matters: the streamed text and the final
      text are the same string in the normal case, and swapping one for an
      identical copy still replaces the part. That re-mounts the renderer, which
      re-runs its reveal animation over text the user has already read — the
      answer appears to stutter or repeat, and the height change bounces the
      scroll position.
    */
    const streamed = this.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    if (streamed === finalText) return;

    const withoutText = this.parts.filter((p) => p.type !== "text");
    this.parts = [...withoutText, { type: "text", text: finalText }];
  }

  startTool(id: string, name: string, args: unknown): void {
    this.parts.push({
      type: "tool-call",
      toolCallId: id,
      toolName: name,
      // Tool input as it came off the wire: JSON by construction, but only the
      // server's schema says so, so it can't be typed as JSON without a cast.
      args: (args ?? {}) as ToolCallMessagePart["args"],
      argsText: JSON.stringify(args ?? {}),
    });
  }

  finishTool(id: string, result: unknown, isError: boolean): void {
    const index = this.parts.findIndex(
      (p) => p.type === "tool-call" && p.toolCallId === id,
    );
    if (index === -1) return;
    const part = this.parts[index] as ToolCallMessagePart;
    this.parts[index] = { ...part, result, isError };
  }

  /**
   * A page the model read, as assistant-ui's own `source` part. Deduped by
   * URL: the model often re-reads a page across a doc loop, and the citation
   * list should say what it consulted, not how many times.
   */
  addSource(url: string, title: string): void {
    const exists = this.parts.some(
      (part) => part.type === "source" && part.url === url,
    );
    if (exists) return;

    this.parts.push({
      type: "source",
      sourceType: "url",
      id: url,
      url,
      title,
    });
  }

  /** An inline component, carried as a resolved tool-call part. */
  addComponent(component: Record<string, unknown>, index: number): void {
    const id = `${COMPONENT_PART}_${index}`;
    this.parts.push({
      type: "tool-call",
      toolCallId: id,
      toolName: COMPONENT_PART,
      args: component as ToolCallMessagePart["args"],
      argsText: JSON.stringify(component),
      result: component,
    });
  }
}

// ── the runtime ──────────────────────────────────────────────────────────────

export interface AssistantRuntimeOptions {
  /**
   * The conversation's redactor + fetched-row store. Owned by the provider (not
   * this hook) because the renderers need the same instances — to restore
   * placeholders for display, and to join table ids against fetched rows.
   */
  session: ToolSession;
  /** Model id from `GET /v1/models`; omitted means the server default. */
  model?: string;
  /**
   * The options to offer under the answer, or null to take them away. Fed by
   * both the model's own `ask_user` question and the fast-tier suggestions,
   * since the user sees one card either way.
   */
  onQuestion?: (question: AssistantQuestion | null) => void;
  /**
   * That the assistant is working, or null once it starts writing — from there
   * the streamed text is the feedback and a status line on top of it would just
   * be noise. It stays "Thinking" through tool calls: the activity trail above
   * it already names the tool that's running, and saying it twice read as two
   * things happening.
   */
  onStatus?: (status: string | null) => void;
  /**
   * Every resource name the dashboard has loaded, read at send time. Names the
   * user types are swapped for tokens before the message leaves the browser.
   */
  nameCatalog?: () => CatalogEntry[];
  /**
   * What the user is looking at, as one line for the model, or null. Read at
   * send time rather than baked into the transcript: it describes this turn,
   * and re-sending it with every later turn would keep pointing the model at a
   * page the user has long since left.
   */
  pageContext?: () => string | null;
  /**
   * Thumbs up/down on an answer. There is no feedback endpoint on the assistant
   * server yet, so the default keeps the vote in the thread (assistant-ui tracks
   * it as message metadata, which is what lights the button up) and goes no
   * further — point this at an API call when one exists.
   */
  onFeedback?: (feedback: { type: "positive" | "negative" }) => void;
}

export function useAssistantRuntime({
  session,
  model,
  onQuestion,
  onStatus,
  onFeedback,
  pageContext,
  nameCatalog,
}: AssistantRuntimeOptions) {
  const { fetch: authedFetch } = useNetBirdFetch(true);
  const executeTool = useToolExecutor();
  const { origin } = useMemo(() => loadAssistantConfig(), []);

  const conversationIdRef = useRef<string>(crypto.randomUUID());
  const componentCountRef = useRef(0);
  const questionCountRef = useRef(0);

  const run = useCallback(
    async function* ({
      messages,
      abortSignal,
    }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
      const base = withPageContext(
        withResolvedNames(
          toWireMessages(messages),
          nameCatalog?.() ?? [],
          session.redactor,
        ),
        pageContext?.() ?? null,
      );
      // Turns generated inside this single run (doc turns + tool round-trips).
      const generated: ChatMessage[] = [];
      const builder = new PartBuilder();

      try {
        onStatus?.("Thinking");
        // Whatever was on offer belonged to the previous answer — the user has
        // moved on, whether by picking an option, typing, or skipping.
        onQuestion?.(null);

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          let pendingToolUse: Extract<ChatEvent, { type: "tool_use" }> | null =
            null;

          const stream = streamChat(
            authedFetch,
            origin,
            {
              messages: [...base, ...generated],
              conversationId: conversationIdRef.current,
              model,
            },
            abortSignal,
          );

          for await (const event of stream) {
            switch (event.type) {
              case "text":
                onStatus?.(null);
                builder.appendText(event.delta);
                yield builder.snapshot();
                break;

              case "reasoning":
                onStatus?.("Thinking");
                builder.appendReasoning(event.delta);
                yield builder.snapshot();
                break;

              case "tool_activity":
                if (event.phase === "start") {
                  builder.startTool(event.id, event.name, event.input);
                } else {
                  onStatus?.("Thinking");
                  builder.finishTool(
                    event.id,
                    event.summary ?? "",
                    event.ok === false,
                  );
                }
                yield builder.snapshot();
                break;

              /*
                Sources are off for now. The server still reports every page
                `fetch_doc` read, and the thread still knows how to render a
                `source` part (`SourceGroup` / `SourceCard`) — dropping the
                event here is the whole switch, so turning it back on is one
                line: `builder.addSource(event.url, event.title)`.
              */
              case "source":
                break;

              case "component": {
                const { type, ...component } = event;
                builder.addComponent(
                  component as Record<string, unknown>,
                  componentCountRef.current++,
                );
                yield builder.snapshot();
                break;
              }

              case "question":
                onQuestion?.({
                  id: `q${questionCountRef.current++}`,
                  title: event.question,
                  options: event.options,
                  multi: event.questionType === "multi_select",
                });
                break;

              /*
                Only ever answers to a question the assistant actually asked.
                The server no longer proposes "what you might ask next": a card
                of invented next steps under every reply is noise, and it turned
                up even under refusals.
              */
              case "suggestions": {
                if (event.quick_replies.length === 0) break;
                onQuestion?.({
                  id: `q${questionCountRef.current++}`,
                  title: event.question || "Pick one",
                  options: event.quick_replies.map((label) => ({ label })),
                  multi: false,
                });
                break;
              }

              case "final":
                builder.replaceText(event.content);
                yield builder.snapshot();
                break;

              case "tool_use":
                pendingToolUse = event;
                break;

              case "error":
                throw new AssistantStreamError(event.message);

              case "done":
                break;
            }
          }

          // No management tool requested — this turn is the answer.
          if (!pendingToolUse) {
            yield {
              ...builder.snapshot(),
              status: { type: "complete", reason: "stop" },
            };
            return;
          }

          // Keep the resent transcript consistent with what the server already
          // processed this turn: its intermediate doc turns, then the assistant
          // message that requested the tools.
          generated.push(...pendingToolUse.appendMessages);
          generated.push({
            role: "assistant",
            content: pendingToolUse.content,
          });

          // Doc results the server already computed go back in the same user
          // message as the tool results we're about to produce.
          const toolResults: LlmContentBlock[] = [
            ...pendingToolUse.serverToolResults,
          ];

          const decisionFor = new Map(
            pendingToolUse.decisions.map((d) => [d.toolUseId, d]),
          );

          for (const block of pendingToolUse.content) {
            if (block.type !== "tool_use") continue;
            if (!isClientTool(block.name)) continue;

            const decision = decisionFor.get(block.id);

            // The server already vetted these against its registry; a rejected
            // name means the model invented one. Report it back instead of
            // executing anything.
            if (decision && !decision.allowed) {
              toolResults.push({
                type: "tool_result",
                toolUseId: block.id,
                content: `Tool "${block.name}" is not allowed.`,
                isError: true,
              });
              continue;
            }

            // Every tool in the current registry is read-only. If a mutating one
            // is ever added, it must be gated behind an explicit confirmation
            // before this point — refuse rather than silently acting.
            if (decision?.mutating) {
              toolResults.push({
                type: "tool_result",
                toolUseId: block.id,
                content:
                  "This action changes configuration and needs explicit user confirmation, which this dashboard version cannot yet request. It was not performed.",
                isError: true,
              });
              continue;
            }

            builder.startTool(block.id, block.name, block.input);
            yield builder.snapshot();

            const outcome = await executeTool(
              block.name,
              block.input,
              session,
              abortSignal,
            );

            builder.finishTool(block.id, outcome.content, outcome.isError);
            onStatus?.("Thinking");
            yield builder.snapshot();

            toolResults.push({
              type: "tool_result",
              toolUseId: block.id,
              content: outcome.content,
              isError: outcome.isError,
            });
          }

          generated.push({ role: "user", content: toolResults });
        }

        // Ran out of turns. Keep whatever was produced and say so plainly.
        builder.appendText(
          "\n\n_I stopped after too many steps without reaching an answer. Try narrowing the question._",
        );
        yield {
          ...builder.snapshot(),
          status: { type: "complete", reason: "stop" },
        };
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const message = describeAssistantError(err);
        // Surface the error in-thread rather than as a bare rejection, so any
        // partial answer and tool trail stay visible.
        builder.appendText(
          builder.snapshot().content?.length ? `\n\n${message}` : message,
        );
        yield {
          ...builder.snapshot(),
          // The status error has to be JSON-serializable, so it carries the
          // described message rather than the Error itself.
          status: { type: "incomplete", reason: "error", error: message },
        };
      } finally {
        // Covers every exit: answered, errored, aborted or out of turns.
        onStatus?.(null);
      }
    },
    [
      authedFetch,
      origin,
      model,
      executeTool,
      nameCatalog,
      onQuestion,
      onStatus,
      pageContext,
      session,
    ],
  );

  const adapter = useMemo<ChatModelAdapter>(() => ({ run }), [run]);

  // Always supplied: without a feedback adapter assistant-ui disables the
  // thumbs buttons entirely, so there'd be nothing to click.
  const feedback = useMemo<FeedbackAdapter>(
    () => ({ submit: ({ type }) => onFeedback?.({ type }) }),
    [onFeedback],
  );

  return useLocalRuntime(adapter, { adapters: { feedback } });
}

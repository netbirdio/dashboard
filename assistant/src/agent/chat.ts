import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type LanguageModelUsage,
  type ModelMessage,
  stepCountIs,
  type StepResult,
  streamText,
  type ToolSet,
} from "ai";
import { lastUserText, shouldBlockInput } from "@/agent/guardrails.ts";
import { anthropic, supportsAdaptiveThinking, supportsEffort } from "@/agent/model.ts";
import type { ChatBody } from "@/agent/request.ts";
import { generateSuggestions } from "@/agent/suggestions.ts";
import { ASK_USER_TOOL } from "@/agent/tools/ask_user.ts";
import { buildToolSet, type ServerToolResult } from "@/agent/tools/registry.ts";
import { loadConfig } from "@/config.ts";
import { classifyLlmError, errorResponse, failureMessage } from "@/errors.ts";
import { PiiVault, restoreChunkStream, scrubMessages } from "@/lib/pii.ts";
import type { Principal } from "@/middleware.ts";

// Everything a turn needs that did not come out of the request body: who is
// asking, which request this is, and the socket the caller can close.
export interface TurnContext {
  requestId: string;
  principal: Principal;
  signal: AbortSignal;
}

const MAX_OUTPUT_TOKENS = 16_000;

type ChatOutcome = "answer" | "tool_use" | "question" | "aborted" | "blocked" | "error";

// Model calls per request: the server loops on its own tools (docs, ask gate)
// up to this many steps; client tool calls end the turn on their own.
const MAX_STEPS = 6;

let systemPrompt: string | null = null;
async function loadSystemPrompt(): Promise<string> {
  systemPrompt ??= await Bun.file(new URL("./instructions.md", import.meta.url).pathname).text();
  return systemPrompt;
}

// A successfully shown question ends the turn: the user has to answer it.
// Gate refusals (ok: false) let the model try again within the step budget.
function sawAnsweredAsk(steps: StepResult<ToolSet>[]): boolean {
  return (steps.at(-1)?.toolResults ?? []).some(
    (r) =>
      r.toolName === ASK_USER_TOOL && (r.output as ServerToolResult | undefined)?.ok === true,
  );
}

// The page context rides on the newest user message, like the system prompt
// documents, without the dashboard having to bake it into stored history.
function injectPageContext(messages: ModelMessage[], context: string): void {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role !== "user") continue;
    if (typeof m.content === "string") {
      m.content = `${context}\n\n${m.content}`;
    } else {
      const text = m.content.find((p) => p.type === "text");
      if (text) text.text = `${context}\n\n${text.text}`;
    }
    return;
  }
}

// What a turn cost, flattened for the log line. Cache reads and writes are
// billed at their own rates, so a total alone can't be turned into money.
function tokenUsage(usage: LanguageModelUsage | undefined) {
  if (!usage) return undefined;
  return {
    inputTokens: usage.inputTokens,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

// A rejected usage promise is not worth failing a served answer over: the turn
// is logged without its cost rather than not at all.
async function settledUsage(
  usage: PromiseLike<LanguageModelUsage>,
): Promise<LanguageModelUsage | undefined> {
  return Promise.resolve(usage).catch(() => undefined);
}

// Every model call a turn makes is billed, so every path that makes one logs —
// including the guardrail rejection, which never reaches the stream.
interface TurnLog {
  outcome: ChatOutcome;
  model: string;
  modelCalls: number;
  durationMs: number;
  usage?: LanguageModelUsage;
  suggestionsUsage?: LanguageModelUsage;
  guardrailUsage?: LanguageModelUsage;
}

function logTurn(ctx: TurnContext, conversationId: string | undefined, turn: TurnLog): void {
  // Metadata only — never the messages, the answer, or tool payloads. The
  // account id is a tenant identifier, and it is what makes the token counts
  // attributable to whoever spent them.
  console.log(
    JSON.stringify({
      event: "chat_turn",
      requestId: ctx.requestId,
      conversationId,
      accountId: ctx.principal.accountId,
      outcome: turn.outcome,
      model: turn.model,
      modelCalls: turn.modelCalls,
      durationMs: turn.durationMs,
      usage: tokenUsage(turn.usage),
      suggestionsUsage: tokenUsage(turn.suggestionsUsage),
      guardrailUsage: tokenUsage(turn.guardrailUsage),
    }),
  );
}

export async function chat(body: ChatBody, ctx: TurnContext): Promise<Response> {
  const cfg = loadConfig();

  const uiMessages = body.messages;

  // Runs before anything reads the text: the guardrail classifier and the
  // suggestions pass also send it to the model provider. Fails open — an
  // unreachable analyzer must not take the chat down with it.
  const vault = new PiiVault();
  await scrubMessages(uiMessages, vault);
  const pageContext = body.pageContext ? await vault.scrubText(body.pageContext) : undefined;

  const userText = lastUserText(uiMessages);

  const turnStart = performance.now();
  const screen = await shouldBlockInput(userText);
  if (screen.blocked) {
    logTurn(ctx, body.id, {
      outcome: "blocked",
      model: cfg.LLM_FAST_MODEL,
      modelCalls: 1,
      durationMs: Math.round(performance.now() - turnStart),
      guardrailUsage: screen.usage,
    });
    return errorResponse("guardrail_blocked", 400, { requestId: ctx.requestId });
  }

  const system = await loadSystemPrompt();
  const model = cfg.LLM_MAIN_MODEL;
  const tools = buildToolSet();

  const messages = await convertToModelMessages(uiMessages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  if (pageContext) injectPageContext(messages, pageContext);

  let modelCalls = 0;
  let failed = false;
  let aborted = false;
  let suggestionsUsage: LanguageModelUsage | undefined;

  const result = streamText({
    model: anthropic()(model),
    system,
    messages,
    tools,
    stopWhen: [stepCountIs(MAX_STEPS), ({ steps }) => sawAnsweredAsk(steps)],
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: ctx.signal,
    providerOptions: {
      anthropic: {
        ...(supportsAdaptiveThinking(model)
          ? { thinking: { type: "adaptive", display: "summarized" } }
          : {}),
        ...(supportsEffort(model) ? { effort: cfg.LLM_EFFORT_MAIN } : {}),
        // Marks the end of the request as a cache breakpoint, so tools, system
        // prompt, and conversation history are all served from cache next turn.
        cacheControl: { type: "ephemeral" },
      } satisfies AnthropicProviderOptions,
    },
    onStepFinish: () => {
      modelCalls++;
    },
    // The user closing the panel or navigating away aborts the request; that is
    // not a failure, and counting it as one hides the real error rate.
    onAbort: () => {
      aborted = true;
    },
    onError: ({ error }) => {
      failed = true;
      console.error(
        `chat turn failed [${classifyLlmError(error)}] request=${ctx.requestId}`,
        error instanceof Error ? error.message : error,
      );
    },
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          onError: (error) => failureMessage(classifyLlmError(error)),
        }),
      );

      let outcome: ChatOutcome = "error";
      try {
        const [finishReason, steps] = await Promise.all([result.finishReason, result.steps]);
        if (aborted) {
          outcome = "aborted";
        } else if (failed) {
          outcome = "error";
        } else if (finishReason === "stop") {
          outcome = "answer";
        } else {
          outcome = sawAnsweredAsk(steps) ? "question" : "tool_use";
        }

        if (outcome === "answer") {
          const text = (await result.text).trim();
          if (text) {
            const { suggestions, usage } = await generateSuggestions(userText, text);
            suggestionsUsage = usage;
            if (suggestions.quick_replies.length) {
              writer.write({ type: "data-suggestions", data: suggestions });
            }
          }
        }
      } catch {
        outcome = aborted ? "aborted" : "error";
      } finally {
        logTurn(ctx, body.id, {
          outcome,
          model,
          modelCalls,
          durationMs: Math.round(performance.now() - turnStart),
          usage: await settledUsage(result.usage),
          suggestionsUsage,
          guardrailUsage: screen.usage,
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    // What the backstop hid on the way in is put back on the way out — the
    // values came from this user's own request, so they may see them again.
    stream: stream.pipeThrough(restoreChunkStream(vault)),
  });
}

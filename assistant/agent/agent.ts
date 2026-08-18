import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type ModelMessage,
  type StopCondition,
  type ToolSet,
} from "ai";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { loadConfig } from "@/config.ts";
import { lastUserText, shouldBlockInput, validateChatRequest } from "@/guardrails.ts";
import type { MutableCtx } from "@/types.ts";
import { errorResponse } from "@/http/respond.ts";
import {
  anthropic,
  classifyLlmError,
  failureMessage,
  supportsAdaptiveThinking,
  supportsEffort,
  toUsage,
} from "@/llm.ts";
import { collectTurnSignals } from "@/instrumentation/signals.ts";
import { record } from "@/db/index.ts";
import { generateSuggestions } from "@/suggestions.ts";
import {
  type ChatOutcome,
  countLlmError,
  countToolRequest,
  llmStreamsInFlight,
  observeChatTurn,
  observeLlm,
} from "@/instrumentation/metrics.ts";
import { buildToolSet, isServerTool, type ServerToolResult } from "@/tools/index.ts";
import { ASK_USER_TOOL } from "@/tools/ui.ts";
import { PiiVault, restoreChunkStream, scrubMessages } from "@/pii.ts";

const MAX_OUTPUT_TOKENS = 16_000;

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
const askAnswered: StopCondition<ToolSet> = ({ steps }) =>
  (steps.at(-1)?.toolResults ?? []).some(
    (r) =>
      r.toolName === ASK_USER_TOOL &&
      (r.output as ServerToolResult | undefined)?.ok === true,
  );

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

export async function chat(req: Request, ctx: MutableCtx): Promise<Response> {
  const cfg = loadConfig();

  const body = await req.arrayBuffer();
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(body));
  } catch {
    ctx.rejection = "invalid_json";
    return errorResponse("invalid_json", 400);
  }
  const validation = await validateChatRequest(raw, body.byteLength);
  if (!validation.ok) {
    ctx.rejection = validation.reason;
    return errorResponse(validation.reason, validation.status, {
      detail: validation.error,
      requestId: ctx.requestId,
    });
  }

  ctx.conversationId = validation.value.id;
  const uiMessages = validation.value.messages;

  // Runs before anything reads the text: the guardrail classifier and the
  // suggestions pass also send it to the model provider. Fails open — an
  // unreachable analyzer must not take the chat down with it.
  const vault = new PiiVault();
  await scrubMessages(uiMessages, vault);
  if (validation.value.pageContext) {
    validation.value.pageContext = await vault.scrubText(validation.value.pageContext);
  }

  const userText = lastUserText(uiMessages);

  if (await shouldBlockInput(userText, ctx)) {
    ctx.rejection = "guardrail_blocked";
    return errorResponse("guardrail_blocked", 400);
  }

  collectTurnSignals(uiMessages, {
    requestId: ctx.requestId,
    conversationId: ctx.conversationId,
    accountId: ctx.principal?.accountId ?? "unknown",
    userId: ctx.principal?.userId ?? "unknown",
    model: cfg.LLM_MAIN_MODEL,
  });

  const system = await loadSystemPrompt();
  const model = cfg.LLM_MAIN_MODEL;
  const tools = buildToolSet();

  const messages = await convertToModelMessages(uiMessages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  if (validation.value.pageContext) injectPageContext(messages, validation.value.pageContext);

  llmStreamsInFlight.inc();
  const turnStart = performance.now();
  let modelCalls = 0;
  let failed = false;

  const result = streamText({
    model: anthropic()(model),
    system,
    messages,
    tools,
    stopWhen: [stepCountIs(MAX_STEPS), askAnswered],
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: req.signal,
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
    onStepFinish: (step) => {
      modelCalls++;
      const durationSec = (performance.now() - turnStart) / 1000;
      const usage = toUsage(step.usage);
      record({
        requestId: ctx.requestId,
        conversationId: ctx.conversationId,
        accountId: ctx.principal!.accountId,
        userId: ctx.principal!.userId,
        provider: "anthropic",
        model,
        task: "chat",
        usage,
        latencyMs: Math.round(durationSec * 1000),
        stopReason: step.finishReason,
        toolCallsRequested: step.toolCalls.length,
        createdAt: new Date(),
      });
      observeLlm({
        provider: "anthropic",
        model,
        tier: "main",
        task: "chat",
        status: "ok",
        durationSec,
        usage,
        toolCalls: step.toolCalls.length,
        stopReason: step.finishReason,
      });
      for (const call of step.toolCalls) {
        countToolRequest(
          call.toolName,
          isServerTool(call.toolName) ? "server" : "client",
        );
      }
    },
    onError: ({ error }) => {
      failed = true;
      const kind = classifyLlmError(error);
      countLlmError(kind, kind !== "auth" && kind !== "invalid_request");
      console.error(
        `chat turn failed [${kind}] request=${ctx.requestId}`,
        error instanceof Error ? error.message : error,
      );
      observeLlm({
        provider: "anthropic",
        model,
        tier: "main",
        task: "chat",
        status: "error",
        durationSec: (performance.now() - turnStart) / 1000,
      });
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
        if (failed) {
          outcome = "error";
        } else if (finishReason === "stop") {
          outcome = "answer";
        } else {
          outcome = askAnswered({ steps }) ? "question" : "tool_use";
        }

        if (outcome === "answer") {
          const text = (await result.text).trim();
          if (text) {
            const suggestions = await generateSuggestions(userText, text, ctx);
            if (suggestions.quick_replies.length) {
              writer.write({ type: "data-suggestions", data: suggestions });
            }
          }
        }
      } catch {
        outcome = "error";
      } finally {
        llmStreamsInFlight.dec();
        const durationSec = (performance.now() - turnStart) / 1000;
        observeChatTurn(outcome, durationSec, modelCalls);
        // Metadata only — never the messages, the answer, or tool payloads.
        console.log(
          JSON.stringify({
            event: "chat_turn",
            requestId: ctx.requestId,
            conversationId: ctx.conversationId,
            outcome,
            model,
            modelCalls,
            durationMs: Math.round(durationSec * 1000),
          }),
        );
      }
    },
  });

  return createUIMessageStreamResponse({
    // What the backstop hid on the way in is put back on the way out — the
    // values came from this user's own request, so they may see them again.
    stream: stream.pipeThrough(restoreChunkStream(vault)),
  });
}

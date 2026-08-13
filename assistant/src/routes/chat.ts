/**
 * POST /v1/chat — one streamed model turn. Stateless: the caller sends the full
 * messages[] each turn.
 *
 * Tools split by who runs them (see src/llm/tools.ts):
 *  - Server tools (docs) hit only public pages, so this server executes them
 *    inline and loops the model until it has an answer — no caller round-trip.
 *    Each step is streamed as a `tool_activity` event for live progress.
 *  - Client tools (management API) run in the caller with the user's JWT. When
 *    the model requests one, we end the turn (stop_reason=tool_use). If we had
 *    already run doc tools this HTTP turn, we hand the caller `appendMessages`
 *    (the intermediate doc turns to append to its transcript) and
 *    `serverToolResults` (pre-computed results for any doc tool in this final
 *    turn) so the resent transcript stays consistent.
 *
 * SSE events: `text` (answer deltas), `reasoning` (the model's own thinking,
 * when the model emits any), `tool_activity` (server doc-tool progress),
 * `component` (inline UI), `question` (a tappable clarifying question — ends the
 * turn), `tool_use` (client tools to execute), `final` (final answer),
 * `suggestions`, `done`, `error`.
 */
import { describeFailure } from "@/llm/errors.ts";
import { providerFor } from "@/llm/registry.ts";
import { toolSpecs, isServerTool, isMutating } from "@/llm/tools.ts";
import { runServerTool } from "@/llm/serverTools.ts";
import { askGate, ASK_USER_TOOL } from "@/ui/ask.ts";
import { generateSuggestions } from "@/llm/suggestions.ts";
import { validateChatRequest, shouldBlockInput } from "@/guardrails/input.ts";
import { createPiiVault, createRestoreStream, scrubTranscript } from "@/guardrails/pii.ts";
import { collectTurnSignals } from "@/telemetry/turnSignals.ts";
import { vetToolUses } from "@/guardrails/output.ts";
import { createSSE } from "@/http/sse.ts";
import type { MutableCtx } from "@/http/compose.ts";
import { loadConfig } from "@/config.ts";
import { record } from "@/telemetry/store.ts";
import {
  observeLlm,
  streamsInFlightGauge,
  countToolRequest,
  countLlmError,
  observeChatTurn,
  observeServerTool,
  type ChatOutcome,
} from "@/telemetry/metrics.ts";
import type { LlmContentBlock, LlmMessage, LlmResult } from "@/types.ts";

type ToolUseBlock = Extract<LlmContentBlock, { type: "tool_use" }>;
const isToolUse = (b: LlmContentBlock): b is ToolUseBlock => b.type === "tool_use";

// Loaded once and cached; kept byte-stable so the Anthropic prompt cache holds.
let systemPrompt: string | null = null;
async function loadSystemPrompt(): Promise<string> {
  return (systemPrompt ??= await Bun.file(new URL("../llm/system.md", import.meta.url).pathname).text());
}

export async function chat(req: Request, ctx: MutableCtx): Promise<Response> {
  const cfg = loadConfig();

  const body = await req.arrayBuffer();
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(body));
  } catch {
    ctx.rejection = "invalid_json";
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const validation = validateChatRequest(raw, body.byteLength);
  if (!validation.ok) {
    ctx.rejection = validation.reason;
    return Response.json({ error: validation.error }, { status: validation.status });
  }

  /*
    Backstop: scrub structural PII the frontend's pseudonymizer may have missed.
    BEFORE the classifier, not after — that pre-screen is itself a model call, so
    scrubbing later would send the very values we're holding back.

    The vault is this request's mapping, and the only thing that can undo it (see
    `out` below, which restores everything streamed to the caller).
  */
  // Stamped on every model call this request makes (see MutableCtx).
  ctx.conversationId = validation.value.conversationId;

  const vault = createPiiVault();
  const messages = cfg.GUARDRAIL_SCRUB_PII
    ? scrubTranscript(validation.value.messages, vault)
    : validation.value.messages;

  if (await shouldBlockInput({ ...validation.value, messages }, ctx)) {
    ctx.rejection = "guardrail_blocked";
    return Response.json({ error: "request blocked by guardrails" }, { status: 400 });
  }
  const requestedModel = validation.value.model;

  /*
    Why the last turn went wrong, if it did: failed steps (they come back as
    errored tool_results) and how the user is talking to us. Read from the
    SCRUBBED transcript, so nothing identifying reaches the counters or the table.
    Fire-and-forget — it must never affect the answer.
  */
  collectTurnSignals(messages, {
    requestId: ctx.requestId,
    conversationId: validation.value.conversationId,
    accountId: ctx.principal?.accountId ?? "unknown",
    userId: ctx.principal?.userId ?? "unknown",
    model: requestedModel,
    now: new Date(),
  });

  const system = await loadSystemPrompt();
  // requestedModel is already allowlist-validated in validateChatRequest.
  const { provider, model } = providerFor("main", requestedModel);
  const tools = toolSpecs(cfg.DOCS_ENABLED);
  const sse = createSSE();
  /*
    The one way out. Every event is restored through the vault, so the caller — and
    the user reading the answer, and a tool call built from a value they typed —
    gets the real thing back, while Anthropic only ever saw a token.
  */
  const out = {
    send: (event: string, data: unknown) => sse.send(event, vault.restoreDeep(data)),
  };

  // Drive the stream out-of-band so we can return the Response immediately.
  void (async () => {
    streamsInFlightGauge.inc();
    const turnStart = performance.now();
    let modelCalls = 0;
    const endTurn = (outcome: ChatOutcome) =>
      observeChatTurn(outcome, (performance.now() - turnStart) / 1000, modelCalls);
    // Whether any answer text reached the user before a failure — the difference
    // between "that was cut short" and "nothing happened".
    let streamedAnswer = false;

    // One streamed model call: forward text deltas, then record telemetry for
    // this call (a doc-loop turn makes several). `callTools = []` omits tools so
    // the model must answer from context (the final synthesis pass).
    const runModelTurn = async (convo: LlmMessage[], callTools = tools): Promise<LlmResult> => {
      const callStart = performance.now();
      modelCalls++;
      const stream = provider.streamChat({
        model,
        maxTokens: cfg.LLM_MAX_TOKENS,
        system,
        tools: callTools,
        messages: convo,
        effort: cfg.LLM_EFFORT_MAIN,
        thinking: cfg.LLM_THINKING,
        thinkingDisplay: cfg.LLM_THINKING_DISPLAY,
      });
      // Deltas are restored through their own buffers: a token can straddle two
      // chunks, and half of one must never reach the caller.
      const textDeltas = createRestoreStream(vault);
      const reasoningDeltas = createRestoreStream(vault);
      const flush = (kind: "text" | "reasoning", rest: string) => {
        if (rest) sse.send(kind, { delta: rest });
      };
      for await (const ev of stream.events()) {
        if (ev.type === "text") {
          if (ev.delta) streamedAnswer = true;
          flush("text", textDeltas.push(ev.delta));
        }
        else if (ev.type === "reasoning")
          flush("reasoning", reasoningDeltas.push(ev.delta));
      }
      flush("text", textDeltas.flush());
      flush("reasoning", reasoningDeltas.flush());
      const final = await stream.final();
      const durationSec = (performance.now() - callStart) / 1000;
      const toolsRequested = final.content.filter((b) => b.type === "tool_use").length;
      record({
        requestId: ctx.requestId,
        conversationId: ctx.conversationId,
        accountId: ctx.principal!.accountId,
        userId: ctx.principal!.userId,
        provider: provider.name,
        model: final.model,
        task: "chat",
        usage: final.usage,
        latencyMs: Math.round(durationSec * 1000),
        stopReason: final.stopReason,
        toolCallsRequested: toolsRequested,
        createdAt: new Date(),
      });
      observeLlm({
        provider: provider.name,
        model: final.model,
        tier: "main",
        task: "chat",
        status: "ok",
        durationSec,
        usage: final.usage,
        toolCalls: toolsRequested,
        stopReason: final.stopReason,
      });
      // Which tools, and whether any of them would change the user's network —
      // aggregate counts can't tell a `list_peers` turn from a `cc_add` one.
      for (const b of final.content) {
        if (b.type !== "tool_use") continue;
        countToolRequest(b.name, isServerTool(b.name) ? "server" : "client", isMutating(b.name));
      }
      return final;
    };

    // Terminal answer: stream the final content, then a fast-tier `suggestions`
    // event (fail-soft — never blocks the response), then close the turn.
    const emitFinal = async (result: LlmResult): Promise<void> => {
      out.send("final", { content: result.content, stopReason: result.stopReason });
      const answerText = result.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      const suggestions = await generateSuggestions(messages, answerText, ctx);
      if (suggestions.quick_replies.length) out.send("suggestions", suggestions);
      out.send("done", { stopReason: result.stopReason });
    };

    try {
      // Intermediate doc turns generated this HTTP request. Handed to the caller
      // only if we later hand off to a client tool; dropped after a doc-only
      // answer (the final text captures what matters, and it saves tokens).
      const generated: LlmMessage[] = [];

      for (let iter = 0; ; iter++) {
        const final = await runModelTurn([...messages, ...generated]);
        const decisions = vetToolUses(final.content);

        if (final.stopReason !== "tool_use") {
          await emitFinal(final);
          endTurn("answer");
          return;
        }

        const toolUses = final.content.filter(isToolUse);
        const serverUses = toolUses.filter((u) => isServerTool(u.name));
        const clientUses = toolUses.filter((u) => !isServerTool(u.name));

        // Run server tools inline (docs, component rendering), streaming progress
        // and any side-channel event (e.g. a validated `component`), and collect
        // their results to feed back to the model.
        const serverResults: LlmContentBlock[] = [];
        let waitingOnUser = false;
        for (const u of serverUses) {
          // The one tool with a precondition beyond its own input: whether the
          // model is allowed to ask depends on the conversation so far, which
          // only this loop can see.
          const gate =
            u.name === ASK_USER_TOOL
              ? askGate([...messages, ...generated], final.content)
              : null;
          if (gate && !gate.allowed) {
            observeServerTool(u.name, "blocked", 0);
            serverResults.push({ type: "tool_result", toolUseId: u.id, content: gate.reason, isError: true });
            continue;
          }

          out.send("tool_activity", { phase: "start", id: u.id, name: u.name, input: u.input });
          const r = await runServerTool(u.name, u.input);
          if (r.emit) out.send(r.emit.event, r.emit.data);
          out.send("tool_activity", { phase: "end", id: u.id, name: u.name, ok: r.ok, summary: r.summary });
          serverResults.push({ type: "tool_result", toolUseId: u.id, content: r.content, isError: !r.ok });
          waitingOnUser ||= r.endsTurn === true;
        }

        // The model asked the user something (ask_user). The question is already
        // on its way as a `question` event, so close the turn on whatever text
        // came before it — no suggestions, since the card is the thing to answer.
        if (waitingOnUser) {
          out.send("final", { content: final.content.filter((b) => b.type === "text"), stopReason: "end_turn" });
          out.send("done", { stopReason: "end_turn" });
          endTurn("question");
          return;
        }

        // Any client tool (or an unknown one) ends the turn: the caller executes
        // it. Ship the intermediate doc turns + this turn's doc results so the
        // caller's resent transcript stays consistent.
        if (clientUses.length > 0 || serverUses.length === 0) {
          out.send("tool_use", {
            content: final.content,
            decisions,
            appendMessages: generated,
            serverToolResults: serverResults,
          });
          out.send("done", { stopReason: final.stopReason });
          endTurn("tool_use");
          return;
        }

        // Doc-only turn: fold results back in and loop.
        generated.push({ role: "assistant", content: final.content });
        generated.push({ role: "user", content: serverResults });

        if (iter + 1 >= cfg.DOCS_MAX_SERVER_ITERS) {
          // Safety cap: a final, tool-free pass forces an answer from what we have.
          const synth = await runModelTurn([...messages, ...generated], []);
          await emitFinal(synth);
          endTurn("answer");
          return;
        }
      }
    } catch (err) {
      /*
        One place decides what the user hears. The message is written for them
        (what to do next) and carries no internals; the code carries the detail
        to the log and the caller's telemetry, where it belongs.
      */
      const failure = describeFailure(err, streamedAnswer);
      out.send("error", {
        message: failure.message,
        code: failure.code,
        retryable: failure.retryable,
      });
      // Request id, not bodies: enough to correlate, nothing to leak.
      console.error(
        `chat turn failed [${failure.code}] request=${ctx.requestId}`,
        err instanceof Error ? err.message : err,
      );
      observeLlm({
        provider: provider.name,
        model,
        tier: "main",
        task: "chat",
        status: "error",
        durationSec: (performance.now() - ctx.startedAt) / 1000,
      });
      countLlmError(failure.code, failure.retryable);
      endTurn("error");
    } finally {
      streamsInFlightGauge.dec();
      sse.close();
    }
  })();

  return sse.response;
}

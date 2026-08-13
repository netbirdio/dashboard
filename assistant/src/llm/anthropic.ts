/**
 * Anthropic provider — the only place @anthropic-ai/sdk is imported. Owns all
 * translation between our neutral domain model and Anthropic's Messages API.
 */
import Anthropic from "@anthropic-ai/sdk";
import { loadConfig } from "@/config.ts";
import { LlmError } from "@/llm/errors.ts";
import { supportsAdaptiveThinking, supportsEffort } from "@/llm/models.ts";
import type {
  ChatParams,
  CompleteParams,
  CompleteResult,
  LlmProvider,
  LlmStream,
} from "@/llm/provider.ts";
import type {
  LlmContentBlock,
  LlmMessage,
  LlmResult,
  LlmStreamEvent,
  LlmTool,
  Usage,
} from "@/types.ts";

let client: Anthropic | null = null;
function sdk(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: loadConfig().ANTHROPIC_API_KEY });
  return client;
}

// ── translation: neutral → Anthropic ────────────────────────────────────────
function toBlockParam(b: LlmContentBlock): Anthropic.Messages.ContentBlockParam {
  switch (b.type) {
    case "text":
      return { type: "text", text: b.text };
    case "thinking":
      return { type: "thinking", thinking: b.thinking, signature: b.signature };
    case "tool_use":
      return { type: "tool_use", id: b.id, name: b.name, input: b.input };
    case "tool_result":
      // Neutral `toolUseId` → Anthropic `tool_use_id`. The naive pass-through
      // cast this used to do left this key missing and broke tool loops.
      return { type: "tool_result", tool_use_id: b.toolUseId, content: b.content, is_error: b.isError };
  }
}

export function toAnthropicMessages(messages: LlmMessage[]): Anthropic.Messages.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content.map(toBlockParam),
  }));
}

export function toAnthropicTools(tools: LlmTool[]): Anthropic.Messages.Tool[] {
  return tools.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
    // Cache the whole tool block set by marking the last entry (stable prefix).
    ...(i === tools.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

// ── translation: Anthropic → neutral ────────────────────────────────────────
function fromAnthropicContent(content: Anthropic.Messages.ContentBlock[]): LlmContentBlock[] {
  const blocks: LlmContentBlock[] = [];
  for (const b of content) {
    if (b.type === "text") blocks.push({ type: "text", text: b.text });
    // Kept, not dropped: the tool loop resends this turn's content, and a
    // thinking block missing from it fails the next request.
    else if (b.type === "thinking")
      blocks.push({ type: "thinking", thinking: b.thinking, signature: b.signature });
    else if (b.type === "tool_use")
      blocks.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
  }
  return blocks;
}

function usageFrom(u: Anthropic.Messages.Usage): Usage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
  };
}

/**
 * SDK error → neutral kind. This is the only place that knows Anthropic's error
 * classes, which is why the classification lives here and not in the route: the
 * rest of the app never imports the SDK, and nothing anywhere string-matches an
 * error message.
 */
function asLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  const detail = err instanceof Error ? err.message : String(err);

  if (err instanceof Anthropic.APIUserAbortError)
    return new LlmError("aborted", false, detail);
  if (err instanceof Anthropic.APIConnectionTimeoutError)
    return new LlmError("timeout", true, detail);
  if (err instanceof Anthropic.APIConnectionError)
    return new LlmError("connection", true, detail);
  if (err instanceof Anthropic.RateLimitError)
    return new LlmError("rate_limit", true, detail);
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError
  ) {
    // Retrying can't fix a rejected key — someone has to change the config.
    return new LlmError("auth", false, detail);
  }
  if (err instanceof Anthropic.BadRequestError)
    return new LlmError("invalid_request", false, detail);
  if (err instanceof Anthropic.InternalServerError) {
    // 529 (overloaded) arrives here too; both clear on their own.
    return new LlmError("overloaded", true, detail);
  }
  if (err instanceof Anthropic.APIError)
    return new LlmError("unknown", true, detail);

  return new LlmError("unknown", true, detail);
}

/** Runs an SDK call, re-throwing whatever it fails with as a neutral LlmError. */
async function mapErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw asLlmError(err);
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;

  streamChat(params: ChatParams): LlmStream {
    const stream = sdk().messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      // System as a cacheable block so the stable prefix bills at cache rates.
      system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
      // Omit `tools` entirely on a tool-free pass (the docs synthesis turn), so
      // the model must answer from context instead of calling another tool.
      ...(params.tools.length ? { tools: toAnthropicTools(params.tools) } : {}),
      // Effort lives inside output_config, not top level. It is the supported
      // way to tune reasoning depth / token spend on current models —
      // temperature and budget_tokens are rejected outright. Dropped for models
      // that predate it (the cheap tiers), which reject it with a 400.
      ...(params.effort && supportsEffort(params.model)
        ? { output_config: { effort: params.effort } }
        : {}),
      /*
        Thinking is sent explicitly (see LLM_THINKING): the API's own default is
        model-dependent, so leaving it out means the same code thinks on one
        model and not on another. `display: "summarized"` because the panel
        renders reasoning — the default omits the text and the UI would show a
        pause with nothing in it.
      */
      ...(params.thinking === "adaptive" && supportsAdaptiveThinking(params.model)
        ? {
            thinking: {
              type: "adaptive" as const,
              display: params.thinkingDisplay ?? ("omitted" as const),
            },
          }
        : {}),
      messages: toAnthropicMessages(params.messages),
    });

    return {
      async *events(): AsyncIterable<LlmStreamEvent> {
        // The iterator itself can throw mid-stream (a dropped connection, an
        // overloaded upstream), so the classification wraps the loop, not just
        // the call that started it.
        const iterator = stream[Symbol.asyncIterator]();
        for (;;) {
          const next = await mapErrors(() => iterator.next());
          if (next.done) return;
          const ev = next.value;
          if (ev.type === "content_block_delta") {
            if (ev.delta.type === "text_delta") {
              yield { type: "text", delta: ev.delta.text };
            } else if (ev.delta.type === "thinking_delta") {
              yield { type: "reasoning", delta: ev.delta.thinking };
            }
          }
        }
      },
      async final(): Promise<LlmResult> {
        const msg = await mapErrors(() => stream.finalMessage());
        return {
          content: fromAnthropicContent(msg.content),
          stopReason: msg.stop_reason ?? null,
          usage: usageFrom(msg.usage),
          model: msg.model,
        };
      },
    };
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const msg = await mapErrors(() =>
      sdk().messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.system,
        messages: toAnthropicMessages(params.messages),
      }),
    );
    const text = msg.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, usage: usageFrom(msg.usage), model: msg.model };
  }
}

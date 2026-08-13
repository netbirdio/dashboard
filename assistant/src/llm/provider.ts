/**
 * The provider-neutral LLM interface every backend implements. App code depends
 * only on this — never on a vendor SDK — so adding a provider is one new file
 * under `providers/` plus a registry entry.
 */
import type {
  LlmMessage,
  LlmResult,
  LlmStreamEvent,
  LlmTool,
  ProviderName,
  Usage,
} from "@/types.ts";

/** Parameters for a streaming chat turn. */
export interface ChatParams {
  model: string;
  maxTokens: number;
  system: string;
  tools: LlmTool[];
  messages: LlmMessage[];
  /** Reasoning effort hint; providers map it to their own knobs (or ignore it). */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /**
   * Whether the model should think before answering. Stated explicitly because
   * the provider default is model-dependent — see LLM_THINKING in config.
   */
  thinking?: "adaptive" | "off";
  /** Whether a reasoning summary is streamed back (see LLM_THINKING_DISPLAY). */
  thinkingDisplay?: "omitted" | "summarized";
}

/** A streaming chat turn: iterate events, then await the final result. */
export interface LlmStream {
  /** Incremental events (text and reasoning deltas). */
  events(): AsyncIterable<LlmStreamEvent>;
  /** Resolves once the turn completes, with the full content + usage. */
  final(): Promise<LlmResult>;
}

/** Parameters for a one-shot (non-streaming) completion used by auxiliary tasks. */
export interface CompleteParams {
  model: string;
  maxTokens: number;
  system?: string;
  messages: LlmMessage[];
}

export interface CompleteResult {
  text: string;
  usage: Usage;
  model: string;
}

export interface LlmProvider {
  readonly name: ProviderName;
  /** Streaming agentic chat turn (main tier). */
  streamChat(params: ChatParams): LlmStream;
  /** One-shot completion for auxiliary tasks (fast tier). */
  complete(params: CompleteParams): Promise<CompleteResult>;
}

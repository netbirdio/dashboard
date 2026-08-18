import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { APICallError, type LanguageModelUsage } from "ai";
import { loadConfig } from "@/config.ts";
import type { Usage } from "@/types.ts";

let provider: AnthropicProvider | null = null;

export function anthropic(): AnthropicProvider {
  provider ??= createAnthropic({ apiKey: loadConfig().ANTHROPIC_API_KEY });
  return provider;
}

// Models predating the current generation reject `effort` and adaptive
// thinking with a 400, so those options are dropped for them.
const PRE_CURRENT_GENERATION_PREFIXES = [
  "claude-haiku",
  "claude-3-haiku",
  "claude-sonnet-4-5",
  "claude-3-5",
  "claude-3-7",
];

const predatesCurrentGeneration = (modelId: string): boolean =>
  PRE_CURRENT_GENERATION_PREFIXES.some((prefix) => modelId.startsWith(prefix));

export function supportsEffort(modelId: string): boolean {
  return !predatesCurrentGeneration(modelId);
}

export function supportsAdaptiveThinking(modelId: string): boolean {
  return !predatesCurrentGeneration(modelId);
}

export type LlmErrorKind =
  | "rate_limit"
  | "overloaded"
  | "auth"
  | "invalid_request"
  | "connection"
  | "unknown";

const FAILURE_MESSAGES: Record<LlmErrorKind, string> = {
  rate_limit:
    "The assistant is handling too many requests right now. Wait a few seconds and try again.",
  overloaded:
    "The assistant is busy at the moment. Try again in a few seconds — it usually clears quickly.",
  auth: "The assistant isn't set up correctly on this deployment. This one needs an administrator.",
  invalid_request:
    "Something in this conversation stopped the assistant from answering. Starting a new chat usually clears it.",
  connection:
    "The assistant couldn't be reached. Try again in a minute; if it keeps failing, let your administrator know.",
  unknown:
    "The assistant ran into an unexpected problem. Try again in a moment; if it keeps happening, let your administrator know.",
};

export function classifyLlmError(err: unknown): LlmErrorKind {
  if (APICallError.isInstance(err)) {
    const status = err.statusCode ?? 0;
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "rate_limit";
    if (status >= 500) return "overloaded";
    if (status >= 400) return "invalid_request";
    return "connection";
  }
  return "unknown";
}

export function failureMessage(kind: LlmErrorKind): string {
  return FAILURE_MESSAGES[kind];
}

// The telemetry table stores uncached input, cache reads, and cache writes
// separately, matching Anthropic's own usage accounting.
export function toUsage(u: LanguageModelUsage | undefined): Usage {
  return {
    inputTokens: u?.inputTokenDetails.noCacheTokens ?? u?.inputTokens ?? 0,
    outputTokens: u?.outputTokens ?? 0,
    cacheReadTokens: u?.inputTokenDetails.cacheReadTokens ?? 0,
    cacheCreationTokens: u?.inputTokenDetails.cacheWriteTokens ?? 0,
  };
}

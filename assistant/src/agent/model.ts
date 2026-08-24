// The model layer: which provider to talk to, and which options a given model
// accepts. A leaf on purpose — chat.ts, guardrails.ts and suggestions.ts all
// need anthropic(), and none of them may depend on the turn.
import { type AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { loadConfig } from "@/config.ts";

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

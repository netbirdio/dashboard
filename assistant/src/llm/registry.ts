/**
 * Tier resolution. A tier (main = chat, fast = the guardrail classifier) resolves
 * to a model id from config and the provider that serves it. Anthropic is the only
 * provider today; it sits behind the LlmProvider interface so the SDK stays
 * isolated in llm/anthropic.ts and app code never imports it directly.
 */
import { AnthropicProvider } from "@/llm/anthropic.ts";
import { loadConfig } from "@/config.ts";
import type { LlmProvider } from "@/llm/provider.ts";
import type { ModelTier } from "@/types.ts";

const provider: LlmProvider = new AnthropicProvider();

export interface ResolvedProvider {
  provider: LlmProvider;
  model: string;
}

/**
 * Resolve a tier to its provider instance + model id. `overrideModel` (from a
 * client's validated request) replaces the tier default; callers must ensure it
 * is allowlisted (see llm/models.ts) before passing it.
 */
export function providerFor(tier: ModelTier, overrideModel?: string): ResolvedProvider {
  const cfg = loadConfig();
  const model = overrideModel ?? (tier === "main" ? cfg.LLM_MAIN_MODEL : cfg.LLM_FAST_MODEL);
  return { provider, model };
}

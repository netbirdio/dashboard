/**
 * The set of models a client may choose from. The browser must never be able to
 * pick an arbitrary model (cost/abuse), so selection is constrained to a
 * server-configured allowlist (LLM_SELECTABLE_MODELS). The configured main model
 * is always selectable and is marked as the default. GET /v1/models exposes this
 * list so the dashboard's selector is server-driven and stays current.
 *
 * Also the home for per-model capability facts the request shape depends on —
 * model policy, not SDK translation, so it lives here rather than in the
 * Anthropic adapter (which imports it).
 */
import { loadConfig } from "@/config.ts";

export interface SelectableModel {
  id: string;
  /** The model used when a request doesn't specify one. */
  default: boolean;
}

/** Models a client may select, default first. Always includes the main model. */
export function selectableModels(): SelectableModel[] {
  const cfg = loadConfig();
  const ids = [...cfg.LLM_SELECTABLE_MODELS];
  if (!ids.includes(cfg.LLM_MAIN_MODEL)) ids.unshift(cfg.LLM_MAIN_MODEL);
  return ids.map((id) => ({ id, default: id === cfg.LLM_MAIN_MODEL }));
}

/** Whether a client-supplied model id is allowed. */
export function isSelectableModel(id: string): boolean {
  return selectableModels().some((m) => m.id === id);
}

/*
  Models that reject the effort parameter. It arrived with the Opus 4.5 / 4.6
  generation, and sending it to a model from before that is a 400 — which is why
  this is a DENY list: an unknown id is assumed current, so a newer model keeps
  its effort tuning instead of silently losing it.

  Matched by prefix because ids carry date suffixes (`claude-haiku-4-5-20251001`).
*/
const NO_EFFORT_SUPPORT = [
  "claude-haiku",
  "claude-3-haiku",
  "claude-sonnet-4-5",
  "claude-3-5",
  "claude-3-7",
];

/**
 * Whether a model accepts `output_config.effort`.
 *
 * The cheap tiers don't, so a deployment that makes Haiku selectable would
 * otherwise 400 on every chat turn — the effort the chat route always sets is
 * fine for the main model and invalid for that one.
 */
export function supportsEffort(modelId: string): boolean {
  return !predatesCurrentGeneration(modelId);
}

/**
 * Whether a model accepts `thinking: {type: "adaptive"}`.
 *
 * Same cutoff as effort: adaptive thinking arrived with the same generation, and
 * older models take a `budget_tokens` budget instead — which this service never
 * sends, so on those the request simply goes out without thinking.
 */
export function supportsAdaptiveThinking(modelId: string): boolean {
  return !predatesCurrentGeneration(modelId);
}

const predatesCurrentGeneration = (modelId: string): boolean =>
  NO_EFFORT_SUPPORT.some((prefix) => modelId.startsWith(prefix));

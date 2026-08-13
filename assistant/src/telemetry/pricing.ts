/**
 * What a chat costs, in dollars.
 *
 * Tokens are the honest measurement and they're already recorded per call; this
 * turns them into the number people actually ask for. Prices are a STATIC table:
 * the provider publishes them per model per million tokens, they change rarely,
 * and reading them from the API on every rollup would trade a rounding error for
 * a dependency. Treat every figure here as an estimate — enough to answer "is
 * this feature going to cost us $5 or $500 a month", not to bill anyone.
 *
 * A model we have no price for is reported as UNPRICED rather than as zero: a
 * silent 0 makes a cost dashboard read low and stay wrong after a model swap,
 * which is exactly when you want to notice.
 */
import type { Usage } from "@/types.ts";

/** USD per million tokens. `cacheWrite` is the 5-minute cache-creation rate. */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/**
 * Keyed by model id PREFIX, longest match first, so a dated snapshot
 * (`claude-sonnet-4-5-20250929`) picks up its family's price without an entry per
 * release. Add a family here when it's first deployed; the unpriced counter is
 * the reminder if that's forgotten.
 */
const PRICES: Record<string, ModelPrice> = {
  "claude-opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-opus": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-4": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-haiku": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  "claude-3-5-haiku": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  "claude-3-5-sonnet": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

export function priceFor(model: string): ModelPrice | null {
  const key = Object.keys(PRICES)
    .filter((prefix) => model.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key]! : null;
}

const PER_MILLION = 1_000_000;

/**
 * Cost of one model call, or null when the model has no price. Cache reads and
 * cache writes are charged at their own rates — with a system prompt this size
 * they're most of the input, so folding them into `input` would overstate the
 * bill by several times.
 */
export function costUsd(model: string, usage: Usage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheCreationTokens * price.cacheWrite) /
    PER_MILLION
  );
}

/** Cost of a bag of per-model token totals; unpriced models are counted, not guessed. */
export function costOfTotals(
  totals: { model: string; usage: Usage }[],
): { usd: number; unpriced: number } {
  let usd = 0;
  let unpriced = 0;
  for (const { model, usage } of totals) {
    const cost = costUsd(model, usage);
    if (cost === null) unpriced += 1;
    else usd += cost;
  }
  return { usd, unpriced };
}

/** p50 / p95 of a numeric sample, linear interpolation. Empty → 0. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (rank - low);
}

export const mean = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

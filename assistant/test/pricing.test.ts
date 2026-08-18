import { describe, expect, it } from "bun:test";
import {
  costOfTotals,
  costUsd,
  mean,
  percentile,
  priceFor,
} from "@/db/index.ts";
import type { Usage } from "@/types.ts";

const usage = (o: Partial<Usage> = {}): Usage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  ...o,
});

describe("priceFor", () => {
  it("matches a dated snapshot to its family", () => {
    expect(priceFor("claude-sonnet-4-5-20250929")).toEqual(
      priceFor("claude-sonnet")!,
    );
  });

  it("prefers the longest matching prefix", () => {
    expect(priceFor("claude-haiku-4-5-20251001")!.input).toBe(1);
  });

  it("returns null for a model nobody has priced", () => {
    expect(priceFor("some-new-model-2027")).toBeNull();
  });
});

describe("costUsd", () => {
  it("charges a million of each token type at its own rate", () => {
    const cost = costUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }),
    );
    expect(cost).toBeCloseTo(3 + 15, 6);
  });

  it("charges cache reads far below fresh input", () => {
    const cached = costUsd("claude-sonnet-4-5", usage({ cacheReadTokens: 1_000_000 }))!;
    const fresh = costUsd("claude-sonnet-4-5", usage({ inputTokens: 1_000_000 }))!;
    expect(cached).toBeLessThan(fresh);
    expect(cached).toBeCloseTo(0.3, 6);
  });

  it("is null — not zero — for an unpriced model", () => {
    expect(costUsd("mystery-model", usage({ inputTokens: 1_000 }))).toBeNull();
  });
});

describe("costOfTotals", () => {
  it("sums what it can price and counts what it can't", () => {
    const { usd, unpriced } = costOfTotals([
      { model: "claude-sonnet-4-5", usage: usage({ outputTokens: 1_000_000 }) },
      { model: "mystery-model", usage: usage({ outputTokens: 1_000_000 }) },
    ]);
    expect(usd).toBeCloseTo(15, 6);
    expect(unpriced).toBe(1);
  });
});

describe("percentile / mean", () => {
  it("interpolates between samples", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 6);
    expect(percentile([1, 2, 3, 4], 0.95)).toBeCloseTo(3.85, 6);
  });

  it("handles a single sample and an empty one", () => {
    expect(percentile([7], 0.95)).toBe(7);
    expect(percentile([], 0.5)).toBe(0);
    expect(mean([])).toBe(0);
  });

  it("mean and median disagree on a skewed day, which is the point", () => {
    const sessions = [...Array(90).fill(0.01), 5];
    expect(mean(sessions)).toBeGreaterThan(percentile(sessions, 0.5));
    expect(percentile(sessions, 0.5)).toBeCloseTo(0.01, 6);
  });
});

import { describe, expect, it, vi } from "vitest";

// @utils/netbird calls loadConfig() at module init, which reads a config
// file the unit tests don't have.
vi.mock("@utils/config", () => ({ default: () => ({}) }));

const { insightsEnabled } = await import("@utils/netbird");

describe("insightsEnabled", () => {
  it("keeps the placeholder Insights pages out of production builds", () => {
    expect(insightsEnabled(false, "production")).toBe(false);
  });

  it("shows them in a build whose deployment opts in", () => {
    expect(insightsEnabled(true, "production")).toBe(true);
  });

  it("shows them under npm run dev without any config", () => {
    expect(insightsEnabled(false, "development")).toBe(true);
  });

  it("keeps them off in unit tests unless opted in", () => {
    expect(insightsEnabled(false, "test")).toBe(false);
    expect(insightsEnabled(true, "test")).toBe(true);
  });
});

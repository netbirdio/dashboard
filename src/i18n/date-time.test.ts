import { describe, expect, it } from "vitest";
import { formatDateTooltip, formatRelativeDate } from "./date-time";

describe("dashboard table timestamps", () => {
  const now = new Date(2026, 0, 2, 13, 5);
  const previous = new Date(2026, 0, 2, 12, 5);

  it("preserves the English relative and absolute table formats", () => {
    expect(formatRelativeDate(previous, "en", now)).toBe("an hour ago");
    expect(formatDateTooltip(now, "en")).toBe("2 January, 2026 at 1:05 PM");
  });

  it("formats past and future activity in Simplified Chinese", () => {
    expect(formatRelativeDate(previous, "zh-Hans", now)).toMatch(/1\s*小时前/);
    expect(formatRelativeDate(now, "zh-Hans", previous)).toMatch(/1\s*小时后/);
    expect(formatDateTooltip(now, "zh-Hans")).toContain("2026年1月2日");
  });
});

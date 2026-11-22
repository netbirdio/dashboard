import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHasChanges } from "@/hooks/useHasChanges";

const hasChanges = (initial: unknown[], next: unknown[]) => {
  const { result, rerender } = renderHook(
    ({ values }) => useHasChanges(values),
    { initialProps: { values: initial } },
  );
  rerender({ values: next });
  return result.current.hasChanges;
};

describe("useHasChanges", () => {
  it("reports no change for the same values", () => {
    expect(
      hasChanges([["g1"], "45", true, false], [["g1"], "45", true, false]),
    ).toBe(false);
  });

  it("reports two values that swapped", () => {
    // Grace Period turned off and Include new peers turned on.
    expect(
      hasChanges([["g1"], "45", true, false], [["g1"], "45", false, true]),
    ).toBe(true);
  });
});

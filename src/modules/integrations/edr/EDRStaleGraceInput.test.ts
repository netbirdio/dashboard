import { describe, expect, it } from "vitest";
import { isValidStaleGrace } from "@/modules/integrations/edr/EDRStaleGraceInput";

describe("isValidStaleGrace", () => {
  it("accepts any value while the grace period is off", () => {
    expect(isValidStaleGrace(false, "")).toBe(true);
    expect(isValidStaleGrace(false, "0")).toBe(true);
    expect(isValidStaleGrace(false, "999")).toBe(true);
  });

  it("accepts whole minutes from 1 to 240", () => {
    expect(isValidStaleGrace(true, "1")).toBe(true);
    expect(isValidStaleGrace(true, "30")).toBe(true);
    expect(isValidStaleGrace(true, "240")).toBe(true);
  });

  it("rejects values outside 1 to 240", () => {
    expect(isValidStaleGrace(true, "0")).toBe(false);
    expect(isValidStaleGrace(true, "-5")).toBe(false);
    expect(isValidStaleGrace(true, "241")).toBe(false);
  });

  it("rejects empty, fractional and non-numeric values", () => {
    expect(isValidStaleGrace(true, "")).toBe(false);
    expect(isValidStaleGrace(true, "1.5")).toBe(false);
    expect(isValidStaleGrace(true, "abc")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { cn } from "./helpers";

describe("cn", () => {
  it("keeps the theme's extra font sizes next to a text colour", () => {
    expect(cn("text-xsm", "text-gray-600")).toBe("text-xsm text-gray-600");
    expect(cn("text-smd", "text-nb-gray-500/85")).toBe(
      "text-smd text-nb-gray-500/85",
    );
  });

  it("lets a later font size replace them", () => {
    expect(cn("text-xsm", "text-sm")).toBe("text-sm");
    expect(cn("text-base", "text-smd")).toBe("text-smd");
  });
});

import chroma from "chroma-js";
import { describe, expect, it } from "vitest";
import { providerLogoColors } from "./providerLogoColors";

describe("providerLogoColors", () => {
  it.each(["#ffffff", "#cbd2d6", "#01A88D", "#33C19E", "#191919", "#412991"])(
    "keeps %s visible on light surfaces and tiles",
    (color) => {
      const { light } = providerLogoColors(color);
      expect(chroma.contrast(light, "#e2e2e2")).toBeGreaterThanOrEqual(3);
      expect(chroma.contrast(light, "#ffffff")).toBeGreaterThanOrEqual(3);
    },
  );

  it("adapts white logo overrides without changing their dark appearance", () => {
    const colors = providerLogoColors("#412991", "#ffffff");
    expect(chroma.contrast(colors.light, "#e2e2e2")).toBeGreaterThanOrEqual(3);
    expect(colors.dark).toBe("#ffffff");
  });

  it("preserves dark brand colors on light backgrounds", () => {
    expect(providerLogoColors("#191919")).toEqual({
      light: "#191919",
      dark: "#cbd2d6",
    });
  });

  it("preserves the existing dark-mode brand ink", () => {
    expect(providerLogoColors("#01A88D").dark).toBe("#01A88D");
    expect(providerLogoColors("#000", "#33C19E").dark).toBe("#33C19E");
  });
});

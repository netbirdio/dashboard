import chroma from "chroma-js";
import { describe, expect, it } from "vitest";
import { getAvatarStyle } from "./avatar";
import { generateColorFromString, generateColorFromUser } from "./helpers";

describe("avatar contrast", () => {
  it.each([
    ["#102030", "#ffffff"],
    ["#f0e0d0", "#000000"],
  ])("uses readable initials on %s", (background, foreground) => {
    const style = getAvatarStyle(background);
    expect(style["--avatar-color"]).toBe(background);
    expect(style["--avatar-foreground"]).toBe(foreground);
  });

  it("keeps text contrast above 4.5:1 for generated and fallback colors", () => {
    const colors = ["#808080", "#9c9c9c", "#f68330"];
    for (const name of [
      "Eduard",
      "Alice",
      "Brandon",
      "System",
      "NetBird",
      "李",
      "",
    ]) {
      colors.push(
        generateColorFromString(name),
        generateColorFromUser({ name }),
      );
    }
    for (const color of colors) {
      const style = getAvatarStyle(color);
      expect(
        chroma.contrast(color, style["--avatar-foreground"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

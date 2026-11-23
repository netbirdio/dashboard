import { describe, expect, it } from "vitest";
import {
  canvasBackground,
  canvasConnectionStroke,
  canvasDisabledEdgeStroke,
  canvasDotColor,
} from "@/modules/control-center/utils/canvas-theme";

describe("canvas-theme", () => {
  it("keeps the dark canvas colours it had before light mode", () => {
    expect(canvasBackground("dark")).toBe("rgb(var(--nb-gray-950))");
    expect(canvasDotColor("dark")).toBe("#717171");
    expect(canvasDisabledEdgeStroke("dark")).toBe("#787878");
    expect(canvasConnectionStroke("dark")).toBe("#7d7d7d");
  });

  it("uses light ramp stops in light mode", () => {
    expect(canvasBackground("light")).toBe("rgb(var(--nb-gray-940))");
    expect(canvasDotColor("light")).toBe("rgb(var(--nb-gray-600))");
    expect(canvasDisabledEdgeStroke("light")).toBe("rgb(var(--nb-gray-700))");
    expect(canvasConnectionStroke("light")).toBe("rgb(var(--nb-gray-700))");
  });
});

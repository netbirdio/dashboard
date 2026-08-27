import { cleanup, render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked rather than wrapped in the real ThemeProvider: the provider reads
// window.matchMedia, which jsdom does not implement.
const themeState = vi.hoisted(() => ({
  resolvedTheme: "dark" as "light" | "dark",
}));
vi.mock("@/contexts/ThemeProvider", () => ({
  useTheme: () => ({
    theme: themeState.resolvedTheme,
    resolvedTheme: themeState.resolvedTheme,
    setTheme: () => undefined,
  }),
}));

const { DirectionIn } = await import("./DirectionIn");

afterEach(cleanup);
beforeEach(() => {
  themeState.resolvedTheme = "dark";
});

const edgeProps = {
  id: "edge-1",
  source: "policy-1",
  target: "peer-1",
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 0,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const renderEdge = (data: {
  enabled: boolean;
  type?: "smoothstep" | "straight" | "bezier";
}) => {
  const { container } = render(
    <svg>
      <DirectionIn
        {...(edgeProps as unknown as Parameters<typeof DirectionIn>[0])}
        data={{ type: "straight", ...data }}
      />
    </svg>,
  );
  return container.querySelector("path");
};

describe("DirectionIn", () => {
  it("strokes enabled edges green (same in both themes) and animates them", () => {
    const path = renderEdge({ enabled: true });
    // jsdom normalizes the #0e9f6e literal to rgb() form.
    expect(path?.style.stroke).toBe("rgb(14, 159, 110)");
    expect(path?.classList.contains("cc-animated-edge")).toBe(true);

    themeState.resolvedTheme = "light";
    cleanup();
    const lightPath = renderEdge({ enabled: true });
    expect(lightPath?.style.stroke).toBe("rgb(14, 159, 110)");
  });

  // Disabled edges must stay on the theme-flipping ramp tokens (and inline —
  // xyflow's .react-flow__edge-path would override a stroke-* utility).
  it("strokes disabled edges with the dark ramp token in dark mode", () => {
    const path = renderEdge({ enabled: false });
    expect(path?.style.stroke).toBe("rgb(var(--nb-gray-400))");
    expect(path?.style.opacity).toBe("0.6");
    expect(path?.classList.contains("cc-animated-edge")).toBe(false);
  });

  it("strokes disabled edges with the light ramp token in light mode", () => {
    themeState.resolvedTheme = "light";
    const path = renderEdge({ enabled: false });
    expect(path?.style.stroke).toBe("rgb(var(--nb-gray-700))");
  });
});

import { cleanup, render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Only useConnection needs a canvas store; everything else is pure.
// vi.hoisted runs before imports, so Position.Right is spelled literally.
const connectionState = vi.hoisted(() => ({
  fromHandle: { id: "handle-1", position: "right" } as {
    id: string | null;
    position: Position;
  } | null,
}));
vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xyflow/react")>()),
  useConnection: () => ({
    fromHandle: connectionState.fromHandle,
    toHandle: null,
  }),
}));

const { ConnectionLine } = await import("./ConnectionLine");

afterEach(cleanup);

const renderLine = () => {
  const { container } = render(
    <svg>
      <ConnectionLine
        {...({
          fromX: 0,
          fromY: 0,
          toX: 100,
          toY: 50,
        } as Parameters<typeof ConnectionLine>[0])}
      />
    </svg>,
  );
  return container.querySelector("path");
};

describe("ConnectionLine", () => {
  it("uses the theme-flipping ramp token and the shared dash animation", () => {
    const path = renderLine();
    // nb-gray-50 is near-white in dark and near-black in light, so one token
    // keeps the drag preview visible on both canvases.
    expect(path?.classList.contains("stroke-nb-gray-50")).toBe(true);
    expect(path?.classList.contains("cc-animated-edge")).toBe(true);
    expect(path?.getAttribute("stroke")).toBeNull();
  });

  it("renders nothing until a source handle exists", () => {
    connectionState.fromHandle = null;
    expect(renderLine()).toBeNull();
  });
});

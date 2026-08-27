import { cleanup, render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The source node lookup: select-user-node carries no data.enabled, so the
// helper's fallback reads false.
vi.mock("@/modules/control-center/utils/helpers", () => ({
  useSourceGroupEnabled: () => false,
}));

const { SimpleConnection } = await import("./SimpleConnection");

afterEach(cleanup);

const edgeProps = {
  id: "edge-1",
  source: "select-user-node",
  target: "peer-1",
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 0,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const renderEdge = (data?: { enabled?: boolean }) => {
  const { container } = render(
    <svg>
      <SimpleConnection
        {...(edgeProps as Parameters<typeof SimpleConnection>[0])}
        data={data}
      />
    </svg>,
  );
  return container.querySelector("path");
};

describe("SimpleConnection", () => {
  it("honours the edge's own enabled flag over the source node's", () => {
    const path = renderEdge({ enabled: true });
    expect(path?.style.opacity).toBe("1");
  });

  it("dims when the edge itself is disabled", () => {
    const path = renderEdge({ enabled: false });
    expect(path?.style.opacity).toBe("0.6");
  });

  it("falls back to the source node's enabled when the edge carries none", () => {
    const path = renderEdge(undefined);
    expect(path?.style.opacity).toBe("0.6");
  });
});

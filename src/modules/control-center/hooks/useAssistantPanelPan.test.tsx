import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CARD_INSET, PANEL_WIDTH } from "@/interfaces/Assistant";

const sidebar = { reveal: false };
const viewport = { x: 0, y: 0, zoom: 1 };
const NODE = { left: 900, width: 200 };
const CONTAINER_WIDTH = 1200;

const setViewport = vi.fn();
const reactFlow = {
  getViewport: () => ({ ...viewport }),
  setViewport,
  getNodes: () => [{ id: "n1", measured: { width: NODE.width } }],
  getInternalNode: () => ({
    internals: { positionAbsolute: { x: NODE.left, y: 0 } },
  }),
  flowToScreenPosition: (p: { x: number; y: number }) => ({
    x: p.x * viewport.zoom + viewport.x,
    y: p.y,
  }),
};

vi.mock("@xyflow/react", () => ({ useReactFlow: () => reactFlow }));
vi.mock("@/interfaces/Assistant", () => ({
  CARD_INSET: 8,
  PANEL_ON_LEFT: false,
  PANEL_WIDTH: 400,
}));
vi.mock("@/modules/assistant/AssistantSidebarProvider", () => ({
  useAssistantSidebar: () => sidebar,
}));

const { useAssistantPanelPan } = await import("./useAssistantPanelPan");

// The node's right edge has to clear the strip the panel takes, plus the margin.
const SHIFT =
  NODE.left + NODE.width - (CONTAINER_WIDTH - PANEL_WIDTH - CARD_INSET) + 64;

const toggle = (rerender: () => void, reveal: boolean) => {
  sidebar.reveal = reveal;
  rerender();
};
const requestedX = () => setViewport.mock.calls.at(-1)?.[0].x;

beforeEach(() => {
  vi.useFakeTimers();
  sidebar.reveal = false;
  viewport.x = 0;
  setViewport.mockClear();
  const canvas = document.createElement("div");
  canvas.className = "react-flow";
  canvas.getBoundingClientRect = () =>
    ({ left: 0, width: CONTAINER_WIDTH }) as DOMRect;
  document.body.append(canvas);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("useAssistantPanelPan", () => {
  it("pans the canvas clear of the panel and back by the same amount", () => {
    const { rerender } = renderHook(() => useAssistantPanelPan());

    toggle(rerender, true);
    expect(requestedX()).toBe(-SHIFT);
    viewport.x = -SHIFT;
    vi.advanceTimersByTime(300);

    toggle(rerender, false);
    expect(requestedX()).toBe(0);
  });

  it("keeps a pan the user made while the panel was open", () => {
    const { rerender } = renderHook(() => useAssistantPanelPan());

    toggle(rerender, true);
    vi.advanceTimersByTime(300);
    viewport.x = -SHIFT + 50;

    toggle(rerender, false);
    expect(requestedX()).toBe(50);
  });

  it("returns to where it started when the panel closes before the pan has finished", () => {
    const { rerender } = renderHook(() => useAssistantPanelPan());

    toggle(rerender, true);
    vi.advanceTimersByTime(100);
    viewport.x = -SHIFT / 3;

    toggle(rerender, false);
    expect(requestedX()).toBe(0);
  });

  it("pans by the full amount again when the panel reopens before the way back has finished", () => {
    const { rerender } = renderHook(() => useAssistantPanelPan());

    toggle(rerender, true);
    viewport.x = -SHIFT;
    vi.advanceTimersByTime(300);
    toggle(rerender, false);
    vi.advanceTimersByTime(100);
    viewport.x = -SHIFT / 2;

    toggle(rerender, true);
    expect(requestedX()).toBe(-SHIFT);
    viewport.x = -SHIFT;
    vi.advanceTimersByTime(300);
    toggle(rerender, false);
    expect(requestedX()).toBe(0);
  });
});

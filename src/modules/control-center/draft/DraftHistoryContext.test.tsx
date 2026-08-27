import { cleanup, renderHook } from "@testing-library/react";
import type { Edge, Node } from "@xyflow/react";
import { act } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// React's own act() is used directly (not RTL's), which requires the flag.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Undo/redo rewrite the changeset via replaceChanges. While a deploy run is in
// flight that is a rewrite UNDER the deploy loop, so the latch published by
// useDeployChangeset has to make both of them no-ops.
let isDraft = true;
let nodes: Node[] = [];
let edges: Edge[] = [];
let changes: { id: string }[] = [];
const setNodes = vi.fn();
const setEdges = vi.fn();
const replaceChanges = vi.fn();
const deployInFlight = { current: false };

vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ nodes, edges, setNodes, setEdges }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ changes, replaceChanges }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterShortcuts", () => ({
  isInputFocused: () => false,
}));
vi.mock("@/modules/control-center/hooks/useDeployChangeset", () => ({
  deployInFlight,
}));

const { DraftHistoryProvider, useDraftHistory } = await import(
  "@/modules/control-center/draft/DraftHistoryContext"
);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DraftHistoryProvider>{children}</DraftHistoryProvider>
);

const mount = () => renderHook(() => useDraftHistory(), { wrapper });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
  isDraft = true;
  nodes = [];
  edges = [];
  changes = [];
  setNodes.mockClear();
  setEdges.mockClear();
  replaceChanges.mockClear();
  deployInFlight.current = false;
});

// The provider captures on a 300ms debounce: commit the initial snapshot, then
// one tracked change on top of it, leaving exactly one undoable step.
const captureOneUndoableStep = () => {
  const view = mount();
  act(() => {
    vi.advanceTimersByTime(400);
  });
  changes = [{ id: "c1" }];
  act(() => view.rerender());
  act(() => {
    vi.advanceTimersByTime(400);
  });
  expect(view.result.current.canUndo).toBe(true);
  return view;
};

describe("undo/redo while a deploy is in flight", () => {
  it("keeps undo inert until the run releases the latch", () => {
    const { result } = captureOneUndoableStep();

    deployInFlight.current = true;
    act(() => result.current.undo());
    expect(replaceChanges).not.toHaveBeenCalled();

    deployInFlight.current = false;
    act(() => result.current.undo());
    expect(replaceChanges).toHaveBeenCalledWith([]);
  });

  it("keeps redo inert too", () => {
    const view = captureOneUndoableStep();
    act(() => view.result.current.undo());
    // Mirror what the (mocked) replaceChanges would have applied, or the next
    // capture flush reads the un-reverted state and clears the redo stack.
    changes = [];
    act(() => view.rerender());
    act(() => {
      vi.advanceTimersByTime(400);
    });
    replaceChanges.mockClear();
    expect(view.result.current.canRedo).toBe(true);

    deployInFlight.current = true;
    act(() => view.result.current.redo());
    expect(replaceChanges).not.toHaveBeenCalled();

    deployInFlight.current = false;
    act(() => view.result.current.redo());
    expect(replaceChanges).toHaveBeenCalledWith([{ id: "c1" }]);
  });

  it("ignores the Cmd+Z shortcut during the run", () => {
    captureOneUndoableStep();

    deployInFlight.current = true;
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", metaKey: true }),
      );
    });
    expect(replaceChanges).not.toHaveBeenCalled();

    deployInFlight.current = false;
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", metaKey: true }),
      );
    });
    expect(replaceChanges).toHaveBeenCalledWith([]);
  });
});

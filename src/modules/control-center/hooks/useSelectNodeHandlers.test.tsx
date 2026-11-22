import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowView } from "@/modules/control-center/header/FlowSelector";

const fit = vi.fn(() => Promise.resolve(true));
const reactFlow = {
  fitView: fit,
  getNodes: () => [],
  getEdges: () => [],
  setCenter: vi.fn(),
  getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  setViewport: vi.fn(),
};

type Canvas = {
  selectedGroup: string;
  layoutInitialized: boolean;
};
let canvas: Canvas;
let rerender: () => void;
const set =
  <K extends keyof Canvas>(key: K) =>
  (value: Canvas[K]) => {
    canvas = { ...canvas, [key]: value };
  };

vi.mock("@xyflow/react", () => ({ useReactFlow: () => reactFlow }));
vi.mock("@/contexts/DialogProvider", () => ({
  useDialog: () => ({ confirm: vi.fn() }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({
    nodes: [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    layoutInitialized: canvas.layoutInitialized,
    setLayoutInitialized: set("layoutInitialized"),
    setInstantDrill: vi.fn(),
    currentView: FlowView.GROUPS,
    setCurrentView: vi.fn(),
    selectedNetwork: "",
    setSelectedNetwork: vi.fn(),
    selectedGroup: canvas.selectedGroup,
    setSelectedGroup: set("selectedGroup"),
    selectedPeer: "",
    setSelectedPeer: vi.fn(),
    selectedUser: "",
    setSelectedUser: vi.fn(),
    setSelectedDestinationGroup: vi.fn(),
    setLiveResourceEditor: vi.fn(),
    loggedInUser: undefined,
  }),
  useDestinationGroup: () => ({
    setFocusedNodeId: vi.fn(),
    highlightArmed: false,
    setHighlightArmed: vi.fn(),
    setSelectedPeerPanel: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({
    setSelectedPolicy: vi.fn(),
    setPolicyModalOpen: vi.fn(),
    openAgentPolicy: vi.fn(),
    openProvider: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft: false }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({
    policies: [],
    peers: [],
    networks: [],
    groups: [{ id: "g1", name: "First" }],
    users: [],
    isLoading: false,
  }),
}));
vi.mock("@/modules/control-center/utils/helpers", () => ({
  getFirstGroup: () => ({ id: "g1", name: "First" }),
  getPlaceholderPeer: () => undefined,
  isFocusWorthy: () => false,
}));

const { useSelectNodeHandlers } = await import(
  "@/modules/control-center/hooks/useSelectNodeHandlers"
);

const view = () => ({ updatedNodes: [], updatedEdges: [] });
const views = {
  applySingleGroupView: view,
  applyPeerView: view,
  applyUserView: view,
  applySingleNetworkView: view,
  applyNetworksView: view,
};

function Harness() {
  useSelectNodeHandlers({ views });
  return null;
}

const settle = () => {
  act(rerender);
  act(rerender);
};

beforeEach(() => {
  canvas = { selectedGroup: "", layoutInitialized: false };
  fit.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  const result = render(<Harness />);
  rerender = () => result.rerender(<Harness />);
  settle();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the live view's camera", () => {
  it("fits the first selection", () => {
    expect(canvas.selectedGroup).toBe("g1");
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it("stays where the user left it when the same selection is rebuilt", () => {
    fit.mockClear();
    canvas = { ...canvas, layoutInitialized: false };
    settle();
    expect(canvas.layoutInitialized).toBe(true);
    expect(fit).not.toHaveBeenCalled();
  });

  it("fits a selection that was set from outside, once", () => {
    fit.mockClear();
    canvas = { selectedGroup: "g2", layoutInitialized: false };
    settle();
    expect(fit).toHaveBeenCalledTimes(1);

    canvas = { ...canvas, layoutInitialized: false };
    settle();
    expect(fit).toHaveBeenCalledTimes(1);
  });
});

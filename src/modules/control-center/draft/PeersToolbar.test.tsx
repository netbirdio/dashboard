import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Node } from "@xyflow/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The toolbar's bulk Remove used to call removeNodeWithEdges directly, skipping
// useNodeRemoval's gate: a removed draft policy kept its create-policy change and
// still deployed, and nodes the gate protects could be removed at all.

let canvasNodes: Node[] = [];
const removeNode = vi.fn();
const removeGroups = vi.fn();
const resetSelectedElements = vi.fn();

vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => canvasNodes,
    getEdges: () => [],
    getInternalNode: () => undefined,
    getNodesBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  }),
  useStore: (
    selector: (s: { nodes: Node[] }) => unknown,
    _equality?: unknown,
  ) => selector({ nodes: canvasNodes }),
  useStoreApi: () => ({
    getState: () => ({ resetSelectedElements }),
    setState: vi.fn(),
  }),
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft: true, drillDownNetworkNodeId: undefined }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ setNodes: vi.fn(), setEdges: vi.fn() }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ updateDraftPolicy: vi.fn() }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ groups: [] }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterShortcuts", () => ({
  useControlCenterShortcuts: () => {},
}));
vi.mock("@/modules/control-center/hooks/useCreateGroupOnCanvas", () => ({
  useCreateGroupOnCanvas: () => ({
    createGroup: vi.fn(),
    modalOpen: false,
    setModalOpen: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/hooks/useCanDeleteGroup", () => ({
  useCanDeleteGroup: () => ({ deletableGroupNodes: () => [] }),
}));
vi.mock("@/modules/control-center/hooks/useDraftGroupActions", () => ({
  GROUP_NODE_TYPES: new Set([
    "groupNode",
    "sourceGroupNode",
    "destinationGroupNode",
  ]),
  useDraftGroupActions: () => ({
    removeGroups,
    confirmAndDeleteGroups: vi.fn(async () => true),
  }),
}));
vi.mock("@/modules/control-center/hooks/useNodeRemoval", () => ({
  useNodeRemoval: () => ({ removeNode }),
}));
vi.mock("@/modules/control-center/draft/modals/CreateGroupNameModal", () => ({
  CreateGroupNameModal: () => null,
}));

const { PeersToolbar } = await import(
  "@/modules/control-center/draft/PeersToolbar"
);

const node = (id: string, type: string, data: Record<string, unknown> = {}) =>
  ({
    id,
    type,
    selected: true,
    position: { x: 0, y: 0 },
    data,
  }) as unknown as Node;

afterEach(cleanup);
beforeEach(() => {
  removeNode.mockClear();
  removeGroups.mockClear();
  canvasNodes = [];
});

describe("the multi-select toolbar's Remove", () => {
  it("routes a mixed selection through the removal gate", () => {
    const policy = node("policy-p1", "policyNode", { policy: { id: "p1" } });
    const group = node("group-new-1", "groupNode", {
      group: { name: "Web" },
    });
    const frame = node("network-n1", "networkNode", {});
    canvasNodes = [policy, group, frame];
    render(<PeersToolbar />);

    fireEvent.click(screen.getByText("Remove"));

    // Groups go as ONE batch so a shared policy is stripped from one snapshot.
    expect(removeGroups).toHaveBeenCalledTimes(1);
    expect(removeGroups.mock.calls[0][0]).toEqual([group]);
    // Everything else goes through removeNode, which enforces canRemoveNode
    // and drops a removed policy's pending change with the node.
    expect(removeNode).toHaveBeenCalledWith(policy);
    expect(removeNode).toHaveBeenCalledWith(frame);
    expect(removeNode).not.toHaveBeenCalledWith(group);
  });

  it("routes a groupable selection through the gate too", () => {
    const peerA = node("peer-1", "peerNode", { peer: { id: "1" } });
    const peerB = node("peer-2", "peerNode", { peer: { id: "2" } });
    canvasNodes = [peerA, peerB];
    render(<PeersToolbar />);

    fireEvent.click(screen.getByText("Remove"));

    expect(removeNode).toHaveBeenCalledWith(peerA);
    expect(removeNode).toHaveBeenCalledWith(peerB);
  });

  it("removes an all-group selection as one batch", () => {
    const groupA = node("group-new-1", "groupNode", {
      group: { name: "Web" },
    });
    const groupB = node("dest-group-Web-p1", "destinationGroupNode", {
      group: { name: "Web" },
    });
    canvasNodes = [groupA, groupB];
    render(<PeersToolbar />);

    fireEvent.click(screen.getByText("Remove"));

    expect(removeGroups).toHaveBeenCalledTimes(1);
    expect(removeGroups.mock.calls[0][0]).toEqual([groupA, groupB]);
  });
});

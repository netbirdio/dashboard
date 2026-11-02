import { renderHook } from "@testing-library/react";
import { Node } from "@xyflow/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const removeGroups = vi.fn();
const removeNodeWithEdges = vi.fn();
const trackDeletePolicy = vi.fn();

// utils/nodes pulls in every node component and, through them, the API layer,
// which calls loadConfig() at module scope.
vi.mock("@utils/config", () => ({
  default: () => ({ apiOrigin: "http://localhost", redirectURI: "/" }),
}));
vi.mock("@/modules/control-center/hooks/useDraftGroupActions", () => ({
  useDraftGroupActions: () => ({ removeGroups, removeNodeWithEdges }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({ trackDeletePolicy }),
}));

import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";

const groupNode = (id: string, type = "groupNode"): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { group: { name: id } },
});

const draftPolicyNode = (id: string): Node => ({
  id: `policy-new-${id}`,
  type: "policyNode",
  position: { x: 0, y: 0 },
  data: { policy: { name: id } },
});

const peerNode = (id: string): Node => ({
  id,
  type: "peerNode",
  position: { x: 0, y: 0 },
  data: {},
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("removeNodes", () => {
  it("sends every group node of the batch in ONE removeGroups call", () => {
    // Per-node calls would each read the same pre-removal ReactFlow store
    // within the tick, so only the last policy strip would survive and two
    // instances of one draft group would keep the create-group forever.
    const { result } = renderHook(() => useNodeRemoval());
    const g1 = groupNode("group-a", "sourceGroupNode");
    const g2 = groupNode("group-b", "destinationGroupNode");
    const g3 = groupNode("group-c");

    act(() => result.current.removeNodes([g1, g2, g3]));

    expect(removeGroups).toHaveBeenCalledTimes(1);
    expect(removeGroups).toHaveBeenCalledWith([g1, g2, g3]);
    expect(removeNodeWithEdges).not.toHaveBeenCalled();
  });

  it("routes non-group nodes per node while batching the groups", () => {
    const { result } = renderHook(() => useNodeRemoval());
    const group = groupNode("group-a");
    const policy = draftPolicyNode("p1");
    const peer = peerNode("peer-1");

    act(() => result.current.removeNodes([policy, group, peer]));

    expect(removeGroups).toHaveBeenCalledTimes(1);
    expect(removeGroups).toHaveBeenCalledWith([group]);
    expect(trackDeletePolicy).toHaveBeenCalledWith({
      policyId: "new-p1",
      name: "p1",
    });
    expect(removeNodeWithEdges).toHaveBeenCalledTimes(2);
    expect(removeNodeWithEdges).toHaveBeenCalledWith(policy.id);
    expect(removeNodeWithEdges).toHaveBeenCalledWith("peer-1");
  });

  it("drops nodes canRemoveNode withholds before dispatching", () => {
    const { result } = renderHook(() => useNodeRemoval());
    const existingPolicy: Node = {
      id: "policy-live-1",
      type: "policyNode",
      position: { x: 0, y: 0 },
      data: { policy: { name: "live" } },
    };
    const framedResource: Node = {
      id: "resource-live-1",
      type: "resourceNode",
      parentId: "network-1",
      position: { x: 0, y: 0 },
      data: {},
    };
    const group = groupNode("group-a");

    act(() =>
      result.current.removeNodes([existingPolicy, framedResource, group]),
    );

    expect(removeGroups).toHaveBeenCalledWith([group]);
    expect(trackDeletePolicy).not.toHaveBeenCalled();
    expect(removeNodeWithEdges).not.toHaveBeenCalled();
  });
});

describe("removeNode", () => {
  it("keeps the single-group path on removeGroups", () => {
    const { result } = renderHook(() => useNodeRemoval());
    const group = groupNode("group-a");

    act(() => result.current.removeNode(group));

    expect(removeGroups).toHaveBeenCalledTimes(1);
    expect(removeGroups).toHaveBeenCalledWith([group]);
  });
});

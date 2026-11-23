import { act, renderHook } from "@testing-library/react";
import { Edge, Node } from "@xyflow/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let nodes: Node[] = [];
let edges: Edge[] = [];
const updateDraftPolicy = vi.fn();
const trackAddGroupMembers = vi.fn();
const addGroupToDraftResource = vi.fn();

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: () => nodes,
    getIntersectingNodes: () => [],
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({
    setNodes: (fn: (n: Node[]) => Node[]) => {
      nodes = fn(nodes);
    },
    setEdges: (fn: (e: Edge[]) => Edge[]) => {
      edges = fn(edges);
    },
  }),
}));
vi.mock("@/modules/control-center/contexts/ControlCenterPolicyModals", () => ({
  useControlCenterPolicy: () => ({ updateDraftPolicy }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({ isDraft: true, drillDownNetworkNodeId: null }),
}));
vi.mock("@/modules/control-center/draft/DraftChangesetContext", () => ({
  useDraftChangeset: () => ({
    trackAddGroupMembers,
    addGroupToDraftResource,
    trackCreateResource: vi.fn(),
  }),
}));
vi.mock("@/modules/control-center/hooks/useControlCenterData", () => ({
  useControlCenterData: () => ({ networkResources: [] }),
}));
vi.mock("@/modules/control-center/hooks/useDraftNetworkActions", () => ({
  getNetworkRef: () => undefined,
  useDraftNetworkActions: () => ({ assignResourceToNetwork: vi.fn() }),
}));

const { setDraftResourceCardGroup, useDragToGroup } = await import(
  "@/modules/control-center/hooks/useDragToGroup"
);

const group = { id: "g1", name: "Databases", peers_count: 0, resources_count: 0 };
const groupNode = () =>
  ({
    id: "group-g1",
    type: "resourceGroupNode",
    position: { x: 0, y: 0 },
    data: { group },
  }) as unknown as Node;
const resource = { id: "r1", name: "db", address: "10.0.0.1/32" };
const resourceCard = (parentId?: string) =>
  ({
    id: "resource-r1",
    type: "resourceNode",
    parentId,
    position: { x: 0, y: 0 },
    data: { resource },
  }) as unknown as Node;
const draftCard = (parentId?: string, data: Record<string, unknown> = {}) =>
  ({
    id: "resource-new-1",
    type: "resourceNode",
    parentId,
    position: { x: 0, y: 0 },
    data: { resource: { name: "db", address: "10.0.0.1/32" }, ...data },
  }) as unknown as Node;
const frame = (id = "network-net-1") =>
  ({ id, type: "networkNode", position: { x: 0, y: 0 }, data: { frame: true } }) as unknown as Node;
const draftResource = { id: "new-1", name: "db", address: "10.0.0.1/32" };
const policyOn = (resourceId: string) =>
  ({
    id: "policy-p1",
    type: "policyNode",
    position: { x: 0, y: 0 },
    data: {
      policy: {
        id: "p1",
        name: "P",
        rules: [
          {
            sources: [{ id: "g0", name: "Devs" }],
            destinations: [],
            destinationResource: { id: resourceId, type: "host" },
          },
        ],
      },
    },
  }) as unknown as Node;
const policyEdge = (cardId: string) =>
  ({ id: "e1", source: "policy-p1", target: cardId }) as Edge;

const add = (
  options: Parameters<
    ReturnType<typeof useDragToGroup>["addMemberToGroup"]
  >[1],
) => {
  const { result } = renderHook(() => useDragToGroup());
  act(() => result.current.addMemberToGroup(nodes[0], options));
  vi.runAllTimers();
};
const cardIds = () => nodes.map((n) => n.id).filter((id) => id.startsWith("resource-"));
const regroupedTo = () =>
  updateDraftPolicy.mock.calls.map(
    ([p]) => p.rules[0].destinations.map((g: { id: string }) => g.id),
  );

beforeEach(() => {
  vi.useFakeTimers();
  updateDraftPolicy.mockClear();
  trackAddGroupMembers.mockClear();
  addGroupToDraftResource.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("addMemberToGroup with a dragged card", () => {
  it("absorbs a framed card and regroups its policies, as a drop does", () => {
    nodes = [groupNode(), resourceCard("network-net-1"), policyOn("r1")];
    edges = [policyEdge("resource-r1")];
    add({ resource: resource as never, draggedNodeId: "resource-r1" });

    expect(cardIds()).toEqual([]);
    expect(edges).toEqual([]);
    expect(regroupedTo()).toEqual([["g1"]]);
    expect(trackAddGroupMembers).toHaveBeenCalledTimes(1);
  });

  it("keeps a framed card and its policies when the caller asks to", () => {
    nodes = [groupNode(), frame(), resourceCard("network-net-1"), policyOn("r1")];
    edges = [policyEdge("resource-r1")];
    add({
      resource: resource as never,
      draggedNodeId: "resource-r1",
      keepFramedCard: true,
    });

    expect(cardIds()).toEqual(["resource-r1"]);
    expect(edges).toHaveLength(1);
    expect(updateDraftPolicy).not.toHaveBeenCalled();
    expect(trackAddGroupMembers).toHaveBeenCalledTimes(1);
  });

  it("absorbs a card whose parent is not a network frame, even when asked to keep it", () => {
    const holder = { ...groupNode(), id: "group-holder", data: {} } as Node;
    nodes = [groupNode(), holder, resourceCard("group-holder"), policyOn("r1")];
    edges = [policyEdge("resource-r1")];
    add({
      resource: resource as never,
      draggedNodeId: "resource-r1",
      keepFramedCard: true,
    });

    expect(cardIds()).toEqual([]);
    expect(regroupedTo()).toEqual([["g1"]]);
  });

  it.each([false, true])(
    "absorbs a standalone card whatever the option (keepFramedCard: %s)",
    (keepFramedCard) => {
      nodes = [groupNode(), resourceCard(), policyOn("r1")];
      edges = [policyEdge("resource-r1")];
      add({
        resource: resource as never,
        draggedNodeId: "resource-r1",
        keepFramedCard,
      });

      expect(cardIds()).toEqual([]);
      expect(edges).toEqual([]);
      expect(regroupedTo()).toEqual([["g1"]]);
    },
  );
});

describe("a draft resource whose card is kept", () => {
  const cardGroups = () =>
    (nodes.find((n) => n.id === "resource-new-1")?.data as {
      resourceGroupIds?: string[];
    })?.resourceGroupIds;

  it("carries the group on its card, where the next sync reads it from", () => {
    nodes = [
      groupNode(),
      frame(),
      draftCard("network-net-1", { resourceGroupIds: ["g0"] }),
    ];
    edges = [];
    add({
      resource: draftResource as never,
      itemId: "new-1",
      draggedNodeId: "resource-new-1",
      keepFramedCard: true,
    });

    expect(cardGroups()).toEqual(["g0", "g1"]);
    expect(addGroupToDraftResource).toHaveBeenCalledWith("new-1", "g1");
  });

  it("carries the group on its card when grouped without naming the card", () => {
    nodes = [groupNode(), draftCard("network-net-1")];
    edges = [];
    add({ resource: draftResource as never, itemId: "new-1" });

    expect(cardGroups()).toEqual(["g1"]);
  });

  it("is absorbed on a drop, leaving no card to carry anything", () => {
    nodes = [groupNode(), draftCard("network-net-1")];
    edges = [];
    add({
      resource: draftResource as never,
      itemId: "new-1",
      draggedNodeId: "resource-new-1",
    });

    expect(cardIds()).toEqual([]);
    expect(addGroupToDraftResource).toHaveBeenCalledWith("new-1", "g1");
  });
});

describe("setDraftResourceCardGroup", () => {
  it("takes the group off the card again", () => {
    const before = [draftCard("network-net-1", { resourceGroupIds: ["g0", "g1"] })];
    const after = setDraftResourceCardGroup(before, "new-1", "g1", false);
    expect(
      (after[0].data as { resourceGroupIds: string[] }).resourceGroupIds,
    ).toEqual(["g0"]);
  });

  it("returns the same array when the card already agrees", () => {
    const before = [draftCard("network-net-1", { resourceGroupIds: ["g1"] })];
    expect(setDraftResourceCardGroup(before, "new-1", "g1", true)).toBe(before);
    expect(setDraftResourceCardGroup(before, "new-9", "g1", true)).toBe(before);
  });
});

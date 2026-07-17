import { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  computeDrillDownKeepSet,
  computeFrameEdgeTargets,
} from "@/modules/control-center/utils/frame-view";

// Spec §10 parent view / drill-down: policy edges to framed resources attach
// to the FRAME in the parent view and to the actual resource inside the
// drill-down; the drill-down shows only the network's own world.

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  type: "peerNode",
  position: { x: 0, y: 0 },
  data: {},
  ...extra,
});

const FRAME = "network-new-n1";
const nodes: Node[] = [
  node(FRAME, { type: "networkNode" }),
  node("resource-new-r1", { type: "resourceNode", parentId: FRAME }),
  node("resource-new-r2", { type: "resourceNode", parentId: FRAME }),
  node("policy-new-p1", { type: "policyNode" }),
  node("peer-a"),
  // Unrelated world.
  node("policy-new-p2", { type: "policyNode" }),
  node("group-g1", { type: "groupNode" }),
  node("peer-b"),
];

const smart = (id: string, source: string, target: string, data = {}): Edge =>
  ({ id, source, target, type: "smart", data } as Edge);

describe("computeFrameEdgeTargets (parent view ↔ drill-down)", () => {
  it("attaches a policy→framed-resource edge to the frame in the parent view", () => {
    const edges = [smart("e1", "policy-new-p1", "resource-new-r1")];
    const next = computeFrameEdgeTargets(nodes, edges, null);
    expect(next?.[0].target).toBe(FRAME);
    // The real target is kept for the reverse swap.
    expect((next?.[0].data as any).resourceTarget).toBe("resource-new-r1");
  });

  it("re-attaches to the actual resource inside that frame's drill-down", () => {
    const edges = [
      smart("e1", "policy-new-p1", FRAME, { resourceTarget: "resource-new-r1" }),
    ];
    const next = computeFrameEdgeTargets(nodes, edges, FRAME);
    expect(next?.[0].target).toBe("resource-new-r1");
  });

  it("is idempotent — returns null when every edge already points right", () => {
    const attached = computeFrameEdgeTargets(
      nodes,
      [smart("e1", "policy-new-p1", "resource-new-r1")],
      null,
    )!;
    expect(computeFrameEdgeTargets(nodes, attached, null)).toBeNull();
  });

  it("restores the direct edge when the resource left its frame", () => {
    const unframed = nodes.map((n) =>
      n.id === "resource-new-r1" ? { ...n, parentId: undefined } : n,
    );
    const edges = [
      smart("e1", "policy-new-p1", FRAME, { resourceTarget: "resource-new-r1" }),
    ];
    const next = computeFrameEdgeTargets(unframed, edges, null);
    expect(next?.[0].target).toBe("resource-new-r1");
    expect((next?.[0].data as any).resourceTarget).toBeUndefined();
  });

  it("leaves routing and membership edges alone", () => {
    const edges: Edge[] = [
      {
        id: "router-peer-a-network-new-n1",
        source: "peer-a",
        target: FRAME,
        type: "floating-straight",
        data: { router: true },
      } as Edge,
    ];
    expect(computeFrameEdgeTargets(nodes, edges, null)).toBeNull();
  });
});

describe("computeDrillDownKeepSet (single-network view)", () => {
  const edges: Edge[] = [
    // peer-a → policy p1 → resource r1 (edge parent-view-attached to frame).
    smart("s1", "peer-a", "policy-new-p1"),
    smart("e1", "policy-new-p1", FRAME, { resourceTarget: "resource-new-r1" }),
    // Unrelated policy p2: group-g1 → p2 → peer-b.
    smart("s2", "group-g1", "policy-new-p2"),
    smart("e2", "policy-new-p2", "peer-b"),
    // Routing peer of the network.
    {
      id: "router-peer-r-network-new-n1",
      source: "peer-router",
      target: FRAME,
      type: "floating-straight",
      data: { router: true },
    } as Edge,
  ];
  const world = [...nodes, node("peer-router")];

  it("keeps the resources and their policies with sources — no frame box, no routing peers (live-mode look)", () => {
    const keep = computeDrillDownKeepSet(world, edges, FRAME);
    expect(keep).toEqual(
      new Set([
        "resource-new-r1",
        "resource-new-r2",
        "policy-new-p1",
        "peer-a",
      ]),
    );
  });

  it("also finds the policy when its edge is already resource-attached", () => {
    const drilledEdges = edges.map((e) =>
      e.id === "e1" ? { ...e, target: "resource-new-r1" } : e,
    );
    const keep = computeDrillDownKeepSet(world, drilledEdges, FRAME);
    expect(keep.has("policy-new-p1")).toBe(true);
    expect(keep.has("peer-a")).toBe(true);
    expect(keep.has("policy-new-p2")).toBe(false);
  });
});

import { Edge, Node } from "@xyflow/react";

// Pure logic behind the parent-view / drill-down frame rules (spec §10),
// consumed by useFrameEdgeAttachment and useNetworkDrillDown and unit-tested
// in frame-view.test.ts.

// Edge-target resolution: a policy edge whose destination is a framed
// resource targets the FRAME in the parent view and the actual resource
// inside that frame's drill-down. The real target is kept on the edge
// (data.resourceTarget) so the swap reverses cleanly. Returns null when
// nothing needs to change.
export function computeFrameEdgeTargets(
  nodes: Node[],
  edges: Edge[],
  drillDownNetworkNodeId: string | null,
): Edge[] | null {
  const frameOf = new Map<string, string>();
  nodes.forEach((n) => {
    if (n.parentId?.startsWith("network-new-")) {
      frameOf.set(n.id, n.parentId);
    }
  });

  let changed = false;
  const next = edges.map((edge) => {
    // Only policy edges — routing/membership edges target frames natively.
    if (edge.type !== "smart") return edge;
    const data = edge.data as { resourceTarget?: string } | undefined;
    const actual = data?.resourceTarget ?? edge.target;
    const frame = frameOf.get(actual);

    if (!frame) {
      // The resource left its frame — restore the direct edge (a removed
      // resource's policy edges are rebuilt by the removal sweep instead).
      if (
        data?.resourceTarget &&
        edge.target !== actual &&
        nodes.some((n) => n.id === actual)
      ) {
        changed = true;
        const { resourceTarget: _, ...rest } = data;
        return { ...edge, target: actual, data: rest };
      }
      return edge;
    }

    const want = drillDownNetworkNodeId === frame ? actual : frame;
    if (edge.target === want && data?.resourceTarget === actual) {
      return edge;
    }
    changed = true;
    return {
      ...edge,
      target: want,
      data: { ...edge.data, resourceTarget: actual },
    };
  });
  return changed ? next : null;
}

// What stays visible inside a frame's drill-down — mirroring the live
// single-network view: the network's resources (WITHOUT the frame box) and
// the policies whose destination lives in the frame — whether their edge
// still attaches to the frame (parent view) or already to the resource
// (post re-attachment flip) — plus those policies' source nodes. The frame
// itself and its routing peers are hidden (routing state lives in the
// header count, exactly like live mode); policies reaching the network only
// via a resource-GROUP stay hidden (accepted gap, see specs/limitations.md).
export function computeDrillDownKeepSet(
  nodes: Node[],
  edges: Edge[],
  frameId: string,
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const keep = new Set<string>();
  nodes.forEach((n) => {
    if (n.parentId === frameId) keep.add(n.id);
  });
  const policyIds = new Set<string>();
  edges.forEach((e) => {
    if (e.type !== "smart" || !e.source.startsWith("policy-")) return;
    const actual =
      (e.data as { resourceTarget?: string })?.resourceTarget ?? e.target;
    if (e.target === frameId || byId.get(actual)?.parentId === frameId) {
      policyIds.add(e.source);
    }
  });
  policyIds.forEach((id) => keep.add(id));
  edges.forEach((e) => {
    if (policyIds.has(e.target)) keep.add(e.source);
  });
  return keep;
}

import { Edge, Node } from "@xyflow/react";

// Pure logic behind the parent-view / drill-down frame rules.

// A policy edge to a framed resource targets the FRAME in the parent view and
// the resource in its drill-down; data.resourceTarget keeps the real target.
export function computeFrameEdgeTargets(
  nodes: Node[],
  edges: Edge[],
  drillDownNetworkNodeId: string | null,
): Edge[] | null {
  const frameOf = new Map<string, string>();
  nodes.forEach((n) => {
    if (n.parentId?.startsWith("network-")) {
      frameOf.set(n.id, n.parentId);
    }
  });

  let changed = false;
  const next = edges.map((edge) => {
    // Only policy edges: routing/membership edges target frames natively.
    if (edge.type !== "smart") return edge;
    const data = edge.data as { resourceTarget?: string } | undefined;
    const actual = data?.resourceTarget ?? edge.target;
    const frame = frameOf.get(actual);

    if (!frame) {
      // The resource left its frame: restore the direct edge.
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

// What stays visible inside a frame's drill-down: the network's resources, the
// policies whose destination lives in the frame, and those policies' sources.
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

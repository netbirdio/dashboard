import { useStore } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Edge node subscription
// ---------------------------------------------------------------------------

export type EdgeNodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Position/size of an edge's endpoint node, subscribed with VALUE equality.
// Edges must use this instead of useInternalNode: xyflow rebuilds its
// internal node lookup on every drag tick, so useInternalNode re-rendered
// EVERY edge per tick — unrelated edges' dash animations visibly flickered
// while dragging one node. With value equality an edge only re-renders when
// one of its own endpoints actually moved or resized.
export function useEdgeNodeRect(nodeId: string): EdgeNodeRect | null {
  return useStore(
    (s) => {
      const n = s.nodeLookup.get(nodeId);
      if (!n) return null;
      return {
        x: n.internals.positionAbsolute.x,
        y: n.internals.positionAbsolute.y,
        width: n.measured.width ?? 0,
        height: n.measured.height ?? 0,
      };
    },
    (a, b) =>
      a === b ||
      (!!a &&
        !!b &&
        a.x === b.x &&
        a.y === b.y &&
        a.width === b.width &&
        a.height === b.height),
  );
}

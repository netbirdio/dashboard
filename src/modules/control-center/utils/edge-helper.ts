import { useStore } from "@xyflow/react";

export type EdgeNodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Position/size of an edge's endpoint node, subscribed with VALUE equality.
// useInternalNode instead re-renders EVERY edge on every drag tick.
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

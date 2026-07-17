import { useEffect, useRef } from "react";
import { useReactFlow, Viewport } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeDrillDownKeepSet } from "@/modules/control-center/utils/frame-view";

// Drill-down (spec §10): clicking a network frame enters a single-network
// draft view — only the frame (full resource grid via useNetworkFrameLayout's
// drilled branch), its routing peers, and the policies targeting its
// resources (plus their sources) stay visible; everything else is hidden.
// The parent canvas is preserved as-is — nothing moves, only `hidden` flags
// change — and restored on exit together with the viewport.
export function useNetworkDrillDown() {
  const { isDraft, drillDownNetworkNodeId, setDrillDownNetworkNodeId } =
    useDraftMode();
  const { nodes, setNodes } = useCanvasState();
  const reactFlow = useReactFlow();
  const prevRef = useRef<string | null>(null);
  const viewportRef = useRef<Viewport | null>(null);

  // Leaving draft or removing the drilled frame always exits the drill-down.
  useEffect(() => {
    if (!drillDownNetworkNodeId) return;
    if (!isDraft || !nodes.some((n) => n.id === drillDownNetworkNodeId)) {
      setDrillDownNetworkNodeId(null);
    }
  }, [isDraft, nodes, drillDownNetworkNodeId, setDrillDownNetworkNodeId]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = drillDownNetworkNodeId;

    if (drillDownNetworkNodeId) {
      if (drillDownNetworkNodeId === prev) return;
      const frameId = drillDownNetworkNodeId;
      viewportRef.current = reactFlow.getViewport();
      const keep = computeDrillDownKeepSet(
        reactFlow.getNodes(),
        reactFlow.getEdges(),
        frameId,
      );

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const hidden = !keep.has(n.id);
          return n.hidden === hidden ? n : { ...n, hidden };
        }),
      );
      // Fit once the drilled layout settled (measured rows → full grid).
      setTimeout(() => {
        const fitNodes = reactFlow.getNodes().filter((n) => keep.has(n.id));
        if (fitNodes.length === 0) return;
        reactFlow.fitView({
          nodes: fitNodes,
          padding: 0.15,
          duration: 500,
          maxZoom: 1,
        });
      }, 200);
      return;
    }

    // Not drilled: reconciling repair — top-level nodes must not be hidden.
    // Covers the exit transition AND hidden leftovers from a restored or
    // undone canvas (hidden flags persist in snapshots, the drill state
    // doesn't). Frame children heal through useNetworkFrameLayout instead —
    // its overflow rows are legitimately hidden in the parent view.
    // When the whole draft is being left there's nothing to restore — the
    // live snapshot replaces the canvas anyway.
    if (!isDraft) return;
    if (nodes.some((n) => n.hidden && !n.parentId)) {
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.hidden && !n.parentId ? { ...n, hidden: false } : n,
        ),
      );
    }
    if (prev && viewportRef.current) {
      reactFlow.setViewport(viewportRef.current, { duration: 400 });
      viewportRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDownNetworkNodeId, isDraft, nodes]);
}

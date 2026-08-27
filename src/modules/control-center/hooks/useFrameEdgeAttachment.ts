import { useEffect } from "react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeFrameEdgeTargets } from "@/modules/control-center/utils/frame-view";
import { isFrameNode } from "@/modules/control-center/utils/helpers";

// A reconciling effect so every edge-producing path is covered.
export function useFrameEdgeAttachment() {
  const { nodes, edges, setEdges } = useCanvasState();
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    // No edge can change frames mid-drag; skip the per-tick recompute.
    if (nodes.some((n) => n.dragging)) return;
    // Attach by frame VISIBILITY, not the drill id, which is set before the
    // animation: an edge flipped onto a hidden frame vanishes mid-animation.
    const drilledFrameHidden =
      !!drillDownNetworkNodeId &&
      !!nodes.find((n) => n.id === drillDownNetworkNodeId)?.hidden;
    const exitingFrame = !drillDownNetworkNodeId
      ? nodes.find((n) => isFrameNode(n) && n.hidden)?.id ?? null
      : null;
    const effectiveDrillId = drilledFrameHidden
      ? drillDownNetworkNodeId
      : exitingFrame;
    const next = computeFrameEdgeTargets(nodes, edges, effectiveDrillId);
    if (next) setEdges(next);
  }, [nodes, edges, setEdges, drillDownNetworkNodeId]);
}

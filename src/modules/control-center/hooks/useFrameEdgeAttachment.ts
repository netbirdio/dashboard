import { useEffect } from "react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeFrameEdgeTargets } from "@/modules/control-center/utils/frame-view";

// Reconciling effect in the style of useNetworkFrameLayout — covers every
// edge-producing path (connect drags, modal saves, sidebar drops, restored
// persistence) and re-runs when the drill-down changes.
export function useFrameEdgeAttachment() {
  const { nodes, edges, setEdges } = useCanvasState();
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    const next = computeFrameEdgeTargets(nodes, edges, drillDownNetworkNodeId);
    if (next) setEdges(next);
  }, [nodes, edges, setEdges, drillDownNetworkNodeId]);
}

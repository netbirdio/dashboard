import { useEffect } from "react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeFrameEdgeTargets } from "@/modules/control-center/utils/frame-view";
import { isFrameNode } from "@/modules/control-center/utils/helpers";

// Reconciling effect in the style of useNetworkFrameLayout — covers every
// edge-producing path (connect drags, modal saves, sidebar drops, restored
// persistence) and re-runs when the drill-down changes.
export function useFrameEdgeAttachment() {
  const { nodes, edges, setEdges } = useCanvasState();
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    // Mid-drag no edge can change frames (membership changes land on drag
    // stop) — skip the per-pointer-move-tick recompute.
    if (nodes.some((n) => n.dragging)) return;
    // Edges re-attach to the resources only once the swap happened (frame
    // hidden) — the drill id is set before the zoom-in choreography. The
    // reverse holds on exit: while the frame is STILL hidden (fade-out /
    // invisible swap) the edges stay on the resources — flipping them onto a
    // hidden frame would make them vanish mid-animation.
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

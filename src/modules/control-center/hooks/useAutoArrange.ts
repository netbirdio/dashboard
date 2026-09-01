import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { applyDraftBuildLayout } from "@/modules/control-center/utils/draft-build-layout";
import {
  applyDrilledLayout,
  getDrilledFrameAnchor,
} from "@/modules/control-center/utils/drilled-layout";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";

/**
 * Auto Arrange — the toolbar button, the `A` shortcut and the assistant's
 * `control_center_canvas`. Re-arranges with the layout the draft was entered with, so
 * arranging an untouched canvas reproduces the initial positions instead of
 * drifting, then fits the camera to the result.
 */
export function useAutoArrange() {
  const reactFlow = useReactFlow();
  const { drillDownNetworkNodeId } = useDraftMode();

  const fitView = useCallback(
    () => reactFlow.fitView({ padding: 0.1, duration: 500, maxZoom: 0.8 }),
    [reactFlow],
  );

  const arrange = useCallback(() => {
    const nodes = reactFlow.getNodes();
    const edges = reactFlow.getEdges();
    if (nodes.length === 0) return;

    const refit = (arranged: typeof nodes) => {
      setTimeout(() => {
        reactFlow.fitView({
          nodes: arranged.filter((n) => !n.hidden),
          padding: 0.1,
          duration: 500,
          maxZoom: 0.8,
          minZoom: DEFAULT_MIN_ZOOM,
        });
      }, 50);
    };

    // Reads and writes through the ReactFlow instance, never useCanvasState: that
    // context changes identity on every nodes update and re-renders every consumer.
    //
    // Drilled into a network: the frame is re-anchored so the resource grid lands
    // on the layout's resource column, as in useNetworkDrillDown.
    if (drillDownNetworkNodeId) {
      const frameId = drillDownNetworkNodeId;
      const keptTop = nodes
        .filter((n) => !n.hidden && !n.parentId)
        .map((n) => ({ ...n }));
      const keptIds = new Set(keptTop.map((n) => n.id));
      const keptEdges = edges.filter(
        (e) => keptIds.has(e.source) && keptIds.has(e.target),
      );
      const { updatedNodes } = applyDrilledLayout(keptTop, keptEdges);
      const drilledPos = new Map(updatedNodes.map((n) => [n.id, n.position]));
      const childCount = nodes.filter((n) => n.parentId === frameId).length;
      drilledPos.set(frameId, getDrilledFrameAnchor(childCount));
      const arranged = nodes.map((n) => {
        const position = drilledPos.get(n.id);
        return position ? { ...n, position } : n;
      });
      reactFlow.setNodes(arranged);
      refit(arranged);
      return;
    }

    const { updatedNodes, updatedEdges } = applyDraftBuildLayout(nodes, edges);
    reactFlow.setNodes(updatedNodes);
    reactFlow.setEdges(updatedEdges);
    refit(updatedNodes);
  }, [reactFlow, drillDownNetworkNodeId]);

  return {
    arrange,
    fitView,
    zoomIn: useCallback(() => reactFlow.zoomIn({ duration: 200 }), [reactFlow]),
    zoomOut: useCallback(
      () => reactFlow.zoomOut({ duration: 200 }),
      [reactFlow],
    ),
  };
}

import { useEffect, useRef } from "react";
import { useReactFlow, Viewport, XYPosition } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeDrillDownKeepSet } from "@/modules/control-center/utils/frame-view";
import {
  applyDrilledLayout,
  getDrilledFrameAnchor,
} from "@/modules/control-center/utils/drilled-layout";

// Drill-down (spec §10): clicking a network frame enters a single-network
// draft view — only the frame (full resource grid via useNetworkFrameLayout's
// drilled branch), its routing peers, and the policies targeting its
// resources (plus their sources) stay visible; everything else is hidden.
// The kept world is RE-LAID OUT like the live single-network view (groups →
// policies → network column, same spacing) so drilling in draft looks the
// same as live; the parent positions are snapshotted and restored on exit
// together with the viewport.
export function useNetworkDrillDown() {
  const { isDraft, drillDownNetworkNodeId, setDrillDownNetworkNodeId } =
    useDraftMode();
  const { nodes, edges, setNodes } = useCanvasState();
  const reactFlow = useReactFlow();
  const prevRef = useRef<string | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  // Parent-view positions of top-level nodes, restored on exit.
  const positionsRef = useRef<Map<string, XYPosition> | null>(null);

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
      // Committed state, NOT the reactFlow store — when the drill id is set
      // in the same commit as a fresh canvas (entering draft from the live
      // drilled view), the store may still hold the previous nodes.
      const keep = computeDrillDownKeepSet(nodes, edges, frameId);

      // Snapshot the parent positions, then lay the kept world out like the
      // LIVE single-network view (same algorithm + spacing) — drilling in
      // draft and entering draft from the live drilled view look identical.
      positionsRef.current = new Map(
        nodes.filter((n) => !n.parentId).map((n) => [n.id, { ...n.position }]),
      );
      const keptTop = nodes
        .filter((n) => keep.has(n.id) && !n.parentId)
        .map((n) => ({ ...n }));
      const keptEdges = edges.filter(
        (e) => keep.has(e.source) && keep.has(e.target),
      );
      const { updatedNodes } = applyDrilledLayout(keptTop, keptEdges);
      const drilledPos = new Map(updatedNodes.map((n) => [n.id, n.position]));
      // The hidden frame anchors the resource grid — placed manually so the
      // first child cell coincides with the layout's resource-column start
      // (including the frame in the layout itself skews the column math).
      const childCount = nodes.filter((n) => n.parentId === frameId).length;
      drilledPos.set(frameId, getDrilledFrameAnchor(childCount));

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const hidden = !keep.has(n.id);
          const position = !n.parentId ? drilledPos.get(n.id) : undefined;
          if (n.hidden === hidden && !position) return n;
          return { ...n, hidden, ...(position ? { position } : {}) };
        }),
      );
      // Fit once the drilled layout settled (measured rows → full grid) —
      // same fit parameters as the live views, so switching live ↔ draft
      // keeps the camera identical.
      setTimeout(() => {
        const fitNodes = reactFlow.getNodes().filter((n) => keep.has(n.id));
        if (fitNodes.length === 0) return;
        reactFlow.fitView({
          nodes: fitNodes,
          padding: 0.1,
          duration: 500,
          maxZoom: 0.8,
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
    // Exit transition: restore the snapshotted parent positions along with
    // the hidden flags (the drill re-laid the kept world out).
    const savedPositions = prev ? positionsRef.current : null;
    if (
      savedPositions ||
      nodes.some((n) => n.hidden && !n.parentId)
    ) {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.parentId) return n;
          const position = savedPositions?.get(n.id);
          if (!n.hidden && !position) return n;
          return { ...n, hidden: false, ...(position ? { position } : {}) };
        }),
      );
    }
    if (prev) positionsRef.current = null;
    if (prev && viewportRef.current) {
      reactFlow.setViewport(viewportRef.current, { duration: 400 });
      viewportRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDownNetworkNodeId, isDraft, nodes, edges]);
}

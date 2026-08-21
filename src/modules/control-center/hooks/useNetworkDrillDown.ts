import { useEffect, useRef } from "react";
import { useReactFlow, Viewport, XYPosition } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeDrillDownKeepSet } from "@/modules/control-center/utils/frame-view";
import {
  DRILLED_RESOURCE_SPACING,
  applyDrilledLayout,
  getDrilledFrameAnchor,
} from "@/modules/control-center/utils/drilled-layout";
import {
  drillInto,
  drillOutOf,
  getNodeRect,
} from "@/modules/control-center/utils/canvas-transition";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";
import {
  NETWORK_FRAME_HEADER,
  NETWORK_FRAME_PADDING_X,
  NETWORK_FRAME_PADDING_Y,
  NETWORK_FRAME_WIDTH,
  getNetworkFrameHeight,
} from "@/modules/control-center/utils/helpers";

// Drill-down keeps only the clicked frame, its routing peers and the policies
// targeting its resources, re-laid out like the live single-network view.
// Parent positions and the viewport are snapshotted and restored on exit.
export function useNetworkDrillDown() {
  const { isDraft, drillDownNetworkNodeId, setDrillDownNetworkNodeId } =
    useDraftMode();
  const { nodes, edges, setNodes } = useCanvasState();
  const reactFlow = useReactFlow();
  const prevRef = useRef<string | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const positionsRef = useRef<Map<string, XYPosition> | null>(null);
  // The reconciling repair must not unhide nodes while the exit fade plays; it
  // would swap the worlds while both are visible.
  const exitingRef = useRef(false);
  const startRafRef = useRef<number | null>(null);

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
      // Only snapshot when entering from the overview: recapturing on a network
      // switch would save the DRILLED positions and collapse the frames on exit.
      const enteringFromOverview = prev == null;
      if (enteringFromOverview) viewportRef.current = reactFlow.getViewport();
      // Committed state, not the reactFlow store: with the drill id set in the
      // same commit as a fresh canvas, the store may still hold the old nodes.
      const keep = computeDrillDownKeepSet(nodes, edges, frameId);

      if (enteringFromOverview || !positionsRef.current) {
        positionsRef.current = new Map(
          nodes
            .filter((n) => !n.parentId)
            .map((n) => [n.id, { ...n.position }]),
        );
      }
      const keptTop = nodes
        .filter((n) => keep.has(n.id) && !n.parentId)
        .map((n) => ({ ...n }));
      const keptEdges = edges.filter(
        (e) => keep.has(e.source) && keep.has(e.target),
      );
      const { updatedNodes } = applyDrilledLayout(keptTop, keptEdges);
      const drilledPos = new Map(updatedNodes.map((n) => [n.id, n.position]));
      // The hidden frame anchors the resource grid; including it in the layout
      // itself skews the column math, so it is placed manually.
      const frameChildren = nodes.filter((n) => n.parentId === frameId);
      const frameChildIndexById = new Map(
        frameChildren.map((n, i) => [n.id, i] as [string, number]),
      );
      const childCount = frameChildren.length;
      const frameAnchor = getDrilledFrameAnchor(childCount);
      drilledPos.set(frameId, frameAnchor);

      const pane = document.querySelector<HTMLElement>(".react-flow");

      // Computed from the precomputed positions instead of waiting for the
      // drilled grid to measure, so the fade-in can start immediately.
      const computeFinalViewport = (): Viewport => {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        const extend = (x: number, y: number, nw: number, nh: number) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + nw);
          maxY = Math.max(maxY, y + nh);
        };
        nodes.forEach((n) => {
          if (n.parentId === frameId) {
            const i = frameChildIndexById.get(n.id) ?? 0;
            extend(
              frameAnchor.x + NETWORK_FRAME_PADDING_X,
              frameAnchor.y +
                NETWORK_FRAME_HEADER +
                NETWORK_FRAME_PADDING_Y +
                i * DRILLED_RESOURCE_SPACING,
              n.measured?.width ?? 200,
              n.measured?.height ?? 66,
            );
            return;
          }
          if (!keep.has(n.id)) return;
          const pos = drilledPos.get(n.id) ?? n.position;
          extend(
            pos.x,
            pos.y,
            n.measured?.width ?? 200,
            n.measured?.height ?? 80,
          );
        });
        // Empty network: the bounds stayed Infinity, which resolves to a
        // transform that can't be panned. Frame the hidden frame's rect instead.
        if (minX === Infinity) {
          const frame = nodes.find((n) => n.id === frameId);
          extend(
            frameAnchor.x,
            frameAnchor.y,
            frame?.measured?.width ?? NETWORK_FRAME_WIDTH,
            frame?.measured?.height ?? getNetworkFrameHeight(0),
          );
        }
        const W = pane?.clientWidth ?? window.innerWidth;
        const H = pane?.clientHeight ?? window.innerHeight;
        const bw = Math.max(maxX - minX, 1);
        const bh = Math.max(maxY - minY, 1);
        // Clamped to the canvas min zoom (setViewport doesn't clamp).
        const zoom = Math.max(
          Math.min((W * 0.8) / bw, (H * 0.8) / bh, 0.8),
          DEFAULT_MIN_ZOOM,
        );
        return {
          zoom,
          x: W / 2 - (minX + bw / 2) * zoom,
          y: H / 2 - (minY + bh / 2) * zoom,
        };
      };

      const applyDrill = (fitDuration: number | null) => {
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            const hidden = !keep.has(n.id);
            const position = !n.parentId ? drilledPos.get(n.id) : undefined;
            if (n.hidden === hidden && !position) return n;
            return { ...n, hidden, ...(position ? { position } : {}) };
          }),
        );
        // null means the caller drives the camera itself: the choreography's
        // grow-in must not be snapped mid-flight.
        if (fitDuration === null) return;
        setTimeout(() => {
          const fitNodes = reactFlow.getNodes().filter((n) => keep.has(n.id));
          if (fitNodes.length === 0) return;
          reactFlow.fitView({
            nodes: fitNodes,
            padding: 0.1,
            duration: fitDuration,
            maxZoom: 0.8,
          });
        }, 200);
      };

      // The dive is skipped when the frame is already hidden: entering draft
      // from the live drilled view is built pre-drilled.
      const frameNode = nodes.find((n) => n.id === frameId);
      if (frameNode && !frameNode.hidden) {
        // Start the dive next frame so the header switch paints first; a
        // same-frame kickoff competes with it and drops frames.
        if (startRafRef.current != null)
          cancelAnimationFrame(startRafRef.current);
        startRafRef.current = requestAnimationFrame(() => {
          startRafRef.current = null;
          drillInto(reactFlow, frameNode, () => applyDrill(null), {
            finalViewport: computeFinalViewport,
          });
        });
      } else {
        applyDrill(500);
      }
      return;
    }

    if (startRafRef.current != null) {
      cancelAnimationFrame(startRafRef.current);
      startRafRef.current = null;
    }

    // Reconciling repair: hidden flags persist in a restored or undone canvas
    // but the drill state doesn't. Frame children heal in useNetworkFrameLayout.
    if (!isDraft) return;
    // The drill re-laid the kept world out, so the positions come back too.
    const savedPositions = prev ? positionsRef.current : null;
    const restoreNodes = () => {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.parentId) return n;
          const position = savedPositions?.get(n.id);
          if (!n.hidden && !position) return n;
          return { ...n, hidden: false, ...(position ? { position } : {}) };
        }),
      );
    };
    if (prev) positionsRef.current = null;

    // Reverse drill: the parent canvas is restored invisibly with the camera
    // close-up on the frame's parent position, then flies out into a fit.
    const savedViewport = viewportRef.current;
    viewportRef.current = null;
    if (prev && savedViewport) {
      exitingRef.current = true;
      const frameNode = nodes.find((n) => n.id === prev);
      const framePos =
        (frameNode && savedPositions?.get(prev)) ?? frameNode?.position;
      const fromRect =
        frameNode && framePos
          ? { ...getNodeRect(frameNode)!, x: framePos.x, y: framePos.y }
          : null;
      drillOutOf(reactFlow, restoreNodes, fromRect, {
        onDone: () => {
          exitingRef.current = false;
        },
      });
      return;
    }

    if (exitingRef.current) return;

    if (savedPositions || nodes.some((n) => n.hidden && !n.parentId)) {
      restoreNodes();
    }
    if (prev && savedViewport) {
      reactFlow.setViewport(savedViewport, { duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setNodes/reactFlow are handles, not replay triggers
  }, [drillDownNetworkNodeId, isDraft, nodes, edges]);
}

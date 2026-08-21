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

// Drill-down: clicking a network frame enters a single-network
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
  // True while the exit choreography plays — the reconciling repair must not
  // unhide nodes mid-fade (it would swap the worlds while still visible).
  const exitingRef = useRef(false);
  const startRafRef = useRef<number | null>(null);

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
      // Snapshot only when entering from the overview — recapturing on a
      // network switch (still drilled) would save the DRILLED positions as the
      // overview and collapse the frames onto each other on exit.
      const enteringFromOverview = prev == null;
      if (enteringFromOverview) viewportRef.current = reactFlow.getViewport();
      // Committed state, NOT the reactFlow store — when the drill id is set
      // in the same commit as a fresh canvas (entering draft from the live
      // drilled view), the store may still hold the previous nodes.
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
      // The hidden frame anchors the resource grid — placed manually so the
      // first child cell coincides with the layout's resource-column start
      // (including the frame in the layout itself skews the column math).
      // Indexed once — the slot lookup below was an O(nodes) filter per child.
      const frameChildren = nodes.filter((n) => n.parentId === frameId);
      const frameChildIndexById = new Map(
        frameChildren.map((n, i) => [n.id, i] as [string, number]),
      );
      const childCount = frameChildren.length;
      const frameAnchor = getDrilledFrameAnchor(childCount);
      drilledPos.set(frameId, frameAnchor);

      const pane = document.querySelector<HTMLElement>(".react-flow");

      // The final fit viewport, computed MATHEMATICALLY from the precomputed
      // positions (+ current measured sizes) — no waiting for the drilled
      // grid to render/measure, so the fade-in can start immediately after
      // the fade-out.
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
            // Drilled grid slot (single column, fixed pitch).
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
        // Empty network — nothing was kept and the frame has no children, so
        // the loop above never extended the bounds. Left as-is they'd stay
        // Infinity and the viewport math below resolves to ±Infinity: a blank
        // canvas stranded at an invalid transform that can't be panned (pan
        // deltas can't move ±Infinity). Frame the camera on the hidden frame's
        // own rect instead, so drilling in lands ON the (empty) grid and a
        // resource added there shows up centered rather than off to the side.
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
        // Fit once the drilled layout settled (measured rows → full grid) —
        // same fit parameters as the live views, so switching live ↔ draft
        // keeps the camera identical. null → the caller drives the camera
        // itself (the choreography's grow-in must not be snapped mid-flight).
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

      // Drill illusion via the shared canvas transition: dive INTO the
      // clicked frame, swap invisibly, grow the drilled world in. Skipped
      // when the frame is already hidden (entering draft from the live
      // drilled view builds pre-drilled).
      const frameNode = nodes.find((n) => n.id === frameId);
      if (frameNode && !frameNode.hidden) {
        // Start the dive next frame so the drilled view (header switch) paints
        // first — a same-frame kickoff made them compete and dropped frames.
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

    // A dive queued for next frame but the drill was already left — drop it.
    if (startRafRef.current != null) {
      cancelAnimationFrame(startRafRef.current);
      startRafRef.current = null;
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

    // Reverse drill illusion via the shared canvas transition: the drilled
    // world zooms OUT while fading, the parent canvas is restored invisibly
    // with the camera close-up ON the frame's parent position (wherever it
    // sits), then the camera flies out of it into a centered fit.
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

    // While the exit choreography is in flight, leave the hidden flags to it.
    if (exitingRef.current) return;

    // Fallback / reconciling repair (no transition to play).
    if (savedPositions || nodes.some((n) => n.hidden && !n.parentId)) {
      restoreNodes();
    }
    if (prev && savedViewport) {
      reactFlow.setViewport(savedViewport, { duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDownNetworkNodeId, isDraft, nodes, edges]);
}

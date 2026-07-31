import { useEffect, useRef } from "react";
import { useReactFlow, Viewport, XYPosition } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { computeDrillDownKeepSet } from "@/modules/control-center/utils/frame-view";
import {
  applyDrilledLayout,
  getDrilledFrameAnchor,
  DRILLED_RESOURCE_SPACING,
} from "@/modules/control-center/utils/drilled-layout";
import {
  NETWORK_FRAME_HEADER,
  NETWORK_FRAME_PADDING_X,
  NETWORK_FRAME_PADDING_Y,
} from "@/modules/control-center/utils/helpers";
import {
  drillInto,
  drillOutOf,
  getNodeRect,
} from "@/modules/control-center/utils/canvas-transition";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";

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
  // Drill-down reparents the frame's resources to INDEPENDENT top-level nodes
  // (so they drag individually and a resource-group becomes a real group
  // node); this remembers each one's original parent/type/position to reparent
  // it back into the frame on exit.
  const reparentedRef = useRef<
    Map<
      string,
      { parentId?: string; type?: string; position: XYPosition }
    > | null
  >(null);
  // True while the exit choreography plays — the reconciling repair must not
  // unhide nodes mid-fade (it would swap the worlds while still visible).
  const exitingRef = useRef(false);

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
      if (drillDownNetworkNodeId === prev) {
        // Already drilled. A resource added into this network is born as a free
        // top-level column node by the drill-aware assign path
        // (assignResourceToNetwork) — TRACK it here so exit reparents it back
        // into the frame, and hide the frame if it was still showing the empty
        // state. A resource reaching here as a frame CHILD (a non-drill-aware
        // add path) is freed into the column defensively.
        const rep = reparentedRef.current;
        if (!rep) return;
        const frameId = drillDownNetworkNodeId;
        const belongs = (n: (typeof nodes)[number]) => {
          if (!n.id.startsWith("resource-")) return false;
          if (n.parentId === frameId) return true;
          const dn = (
            n.data as {
              draftNetwork?: { networkId?: string; networkClientId?: string };
            }
          )?.draftNetwork;
          return (
            !n.parentId &&
            `network-${dn?.networkClientId ?? dn?.networkId ?? ""}` === frameId
          );
        };
        const untracked = nodes.filter((n) => belongs(n) && !rep.has(n.id));
        const frameNode = nodes.find((n) => n.id === frameId);
        const needFrameHide = !!frameNode && !frameNode.hidden;
        if (untracked.length === 0 && !needFrameHide) return;
        // Track every newcomer for exit (reparent into the frame; the frame
        // layout re-grids the exact position on exit, so any is fine).
        untracked.forEach((n) =>
          rep.set(n.id, {
            parentId: frameId,
            type: n.type,
            position: { ...n.position },
          }),
        );
        // Only frame CHILDREN need freeing/positioning — top-level newcomers
        // are already placed by the assign path.
        const frameChildren = untracked.filter((n) => n.parentId === frameId);
        const colX = frameNode
          ? frameNode.position.x + NETWORK_FRAME_PADDING_X
          : 0;
        const placedTop = nodes.filter((n) => rep.has(n.id) && !n.parentId);
        let nextY = placedTop.length
          ? Math.max(...placedTop.map((n) => n.position.y)) +
            DRILLED_RESOURCE_SPACING
          : frameNode
          ? frameNode.position.y +
            NETWORK_FRAME_HEADER +
            NETWORK_FRAME_PADDING_Y
          : 0;
        const placements = new Map<string, XYPosition>();
        frameChildren.forEach((child) => {
          placements.set(child.id, { x: colX, y: nextY });
          nextY += DRILLED_RESOURCE_SPACING;
        });
        if (frameChildren.length === 0 && !needFrameHide) return;
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            // First resource added into a previously-EMPTY drilled network:
            // the frame was kept visible as the empty state — hide it now so
            // the top-level resource replaces it (a no-op for the normal drill
            // where the frame is already hidden).
            if (n.id === frameId && !n.hidden) {
              return { ...n, hidden: true };
            }
            const pos = placements.get(n.id);
            if (!pos) return n;
            return {
              ...n,
              hidden: false,
              parentId: undefined,
              extent: undefined,
              selectable: undefined,
              draggable: undefined,
              type: n.type === "resourceGroupNode" ? "groupNode" : n.type,
              position: pos,
            };
          }),
        );
        return;
      }
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
      // An empty network (no resources, no policies) has nothing to reparent
      // or lay out — drilling would dive into a blank canvas (empty bounds →
      // NaN fit, camera stuck at the dive-in zoom). Keep the FRAME itself
      // visible so the drill lands on the centered "No Resources / Add
      // Resource" empty state; the first resource added hides it (below).
      const emptyDrill = keep.size === 0;
      if (emptyDrill) keep.add(frameId);
      const { updatedNodes } = applyDrilledLayout(keptTop, keptEdges);
      const drilledPos = new Map(updatedNodes.map((n) => [n.id, n.position]));
      // The hidden frame anchors the resource grid — placed manually so the
      // first child cell coincides with the layout's resource-column start
      // (including the frame in the layout itself skews the column math).
      const drilledChildren = nodes
        .filter((n) => n.parentId === frameId)
        .sort(
          (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
        );
      const childCount = drilledChildren.length;
      const frameAnchor = getDrilledFrameAnchor(childCount);
      drilledPos.set(frameId, frameAnchor);

      // Reparent each resource to a free TOP-LEVEL node laid out in a single
      // column (ABSOLUTE position = frame anchor + the column slot). A
      // resource-GROUP row becomes a real group node. Originals are kept so
      // exit puts them back into the frame.
      const reparented = new Map<
        string,
        { parentId?: string; type?: string; position: XYPosition }
      >();
      drilledChildren.forEach((child, i) => {
        reparented.set(child.id, {
          parentId: child.parentId,
          type: child.type,
          position: { ...child.position },
        });
        drilledPos.set(child.id, {
          x: frameAnchor.x + NETWORK_FRAME_PADDING_X,
          y:
            frameAnchor.y +
            NETWORK_FRAME_HEADER +
            NETWORK_FRAME_PADDING_Y +
            i * DRILLED_RESOURCE_SPACING,
        });
      });
      reparentedRef.current = reparented;

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
            const i = nodes
              .filter((c) => c.parentId === frameId)
              .indexOf(n);
            extend(
              frameAnchor.x + 20,
              frameAnchor.y + 86 + i * 95,
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
            const rep = reparented.get(n.id);
            if (rep) {
              // Free the resource: top-level, absolute-positioned, draggable
              // and selectable; a resource-group becomes a real group node.
              return {
                ...n,
                hidden,
                parentId: undefined,
                extent: undefined,
                selectable: undefined,
                draggable: undefined,
                type:
                  rep.type === "resourceGroupNode" ? "groupNode" : n.type,
                position: drilledPos.get(n.id) ?? n.position,
              };
            }
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
        drillInto(reactFlow, frameNode, () => applyDrill(null), {
          finalViewport: computeFinalViewport,
        });
      } else {
        applyDrill(500);
      }
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
    const reparented = prev ? reparentedRef.current : null;
    const restoreNodes = () => {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          // Put a freed resource back INTO its frame (parent/type/position),
          // where the frame layout re-grids it.
          const rep = reparented?.get(n.id);
          if (rep) {
            return {
              ...n,
              hidden: false,
              parentId: rep.parentId,
              type: rep.type,
              position: rep.position,
              selectable: false,
            };
          }
          if (n.parentId) return n;
          const position = savedPositions?.get(n.id);
          if (!n.hidden && !position) return n;
          return { ...n, hidden: false, ...(position ? { position } : {}) };
        }),
      );
    };
    if (prev) {
      positionsRef.current = null;
      reparentedRef.current = null;
    }

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

import { useEffect } from "react";
import { Node } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_CHILD_WIDTH_MULTI,
  NETWORK_FRAME_FALLBACK_ROW,
  NETWORK_FRAME_GAP,
  NETWORK_FRAME_HEADER,
  NETWORK_FRAME_PADDING_X,
  NETWORK_FRAME_PADDING_Y,
  NETWORK_FRAME_MAX_VISIBLE,
  NETWORK_FRAME_ADD_ROW,
  NETWORK_FRAME_ROW_GAP,
  getNetworkFrameHeight,
  getNetworkFrameWidth,
  isFrameNode,
} from "@/modules/control-center/utils/helpers";
import { DRILLED_RESOURCE_SPACING } from "@/modules/control-center/utils/drilled-layout";

// Base z-index for network frames — their resource children render at
// FRAME_Z + 1, so both sit above default (0) nodes and no plain node can slip
// between the frame and its resources.
const FRAME_Z = 1;

// The "+N more" cell a network frame shows in its last grid slot once its
// resources overflow the visible cap. Frame-relative rect + the hidden count;
// NetworkNode renders it as an overlay (see MoreResourcesNode).
export type FrameMoreCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

const sameMoreCell = (a?: FrameMoreCell, b?: FrameMoreCell) => {
  if (!a || !b) return !a && !b;
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.count === b.count
  );
};

// Reconciling layout for network frames: resources fill a row-major grid
// under the header (column count targets a viewport-shaped frame, see
// getFrameGridColumns), 16px inset, the frame grows/shrinks to fit. Only
// writes when a position/size actually drifted, so it settles once ReactFlow
// reports measured dimensions. Overflow past the visible cap collapses into a
// "+N more" cell NetworkNode overlays on the last grid slot (rect computed
// here) — so the frame's only children are resource nodes.
export function useNetworkFrameLayout() {
  const { nodes, setNodes } = useCanvasState();
  const { isDraft, drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    // Mid-drag the grid can't change (membership changes land on drag stop)
    // — skip the O(frames × nodes) reconcile per pointer-move tick; the
    // effect reruns when the drag ends (dragging flags clear).
    if (nodes.some((n) => n.dragging)) return;
    const frames = nodes.filter(isFrameNode);
    if (frames.length === 0) return;

    const updates = new Map<string, Partial<Node>>();
    // Legacy utility children from older drafts: the "Add Resource" row became
    // a bottom button and the overflow row became a "+N more" overlay cell
    // (neither is a child node anymore), so any persisted ones are swept off
    // the canvas.
    const obsolete = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.parentId?.startsWith("network-") &&
        (n.id.startsWith("add-resource-") || n.id.startsWith("overflow-"))
      ) {
        obsolete.add(n.id);
      }
    });

    frames.forEach((frame) => {
      // While a frame is drilled, the others are hidden and frozen — writing
      // to them would fight the drill-down's hidden flags.
      if (drillDownNetworkNodeId && frame.id !== drillDownNetworkNodeId) {
        return;
      }
      // A hidden frame with no active drill is mid-exit-choreography (or
      // about to be healed by the drill hook's repair) — freeze it: laying
      // its children back into the parent grid now would visibly yank the
      // still-shown drilled cards.
      if (frame.hidden && frame.id !== drillDownNetworkNodeId) {
        return;
      }
      // Drilled RENDERING only once the swap happened (frame hidden) — the
      // drill id is set before the zoom-in choreography, and the frame must
      // keep its parent look while still visible.
      const drilled = frame.id === drillDownNetworkNodeId && !!frame.hidden;
      const resources = nodes.filter(
        (n) => n.parentId === frame.id && !obsolete.has(n.id),
      );
      // Parent grid: order by visual position so the cells read top-to-bottom.
      // Drilled: keep a STABLE order (insertion order) instead — re-sorting by
      // position every reconcile meant moving one drilled card reshuffled the
      // grid indices of all the others (a visible "auto-arrange" on every drag).
      if (!drilled) {
        resources.sort(
          (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
        );
      }

      // Parent view caps visible cells at NETWORK_FRAME_MAX_VISIBLE. Past the
      // cap the LAST cell becomes a "+N more" cell (NetworkNode renders it from
      // the rect computed below), so one real resource yields its slot to it.
      // The drill-down shows everything in a square-ish grid, no overflow.
      const hasMore = !drilled && resources.length > NETWORK_FRAME_MAX_VISIBLE;
      const visibleResources = drilled
        ? resources
        : resources.slice(
            0,
            hasMore ? NETWORK_FRAME_MAX_VISIBLE - 1 : NETWORK_FRAME_MAX_VISIBLE,
          );
      const moreCount = hasMore
        ? resources.length - visibleResources.length
        : 0;

      // The "+N more" cell shares the resources' grid, so count it toward the
      // column decision.
      const cellCount = visibleResources.length + (hasMore ? 1 : 0);
      // Drilled: a single column at the shared drilled layout's FIXED pitch
      // — pixel-identical to the live single-network view's resource column
      // (measured-height pitches would drift a few px per row).
      const cols = drilled ? 1 : cellCount > 1 ? 2 : 1;
      // Empty / single-resource parent frames mirror the two-resource size so
      // the frame doesn't jump as the first resources land: a lone resource
      // spans both columns' worth of width (→ same frame width as two
      // resources), and the height already matches (both are one row).
      const sparse = !drilled && resources.length <= 1;
      // Multi-column rows hug their content; a single row spans the frame's
      // card width — the two-column width when sparse.
      const childWidth =
        cols > 1
          ? NETWORK_FRAME_CHILD_WIDTH_MULTI
          : sparse
          ? 2 * NETWORK_FRAME_CHILD_WIDTH_MULTI + NETWORK_FRAME_GAP
          : NETWORK_FRAME_CHILD_WIDTH;
      const width = getNetworkFrameWidth(cols, childWidth);

      resources.slice(visibleResources.length).forEach((child) => {
        const clearFree = !!child.data?.drilledFreePos;
        if (!child.hidden || child.selectable !== false || clearFree) {
          updates.set(child.id, {
            hidden: true,
            selectable: false,
            ...(clearFree
              ? { data: { ...child.data, drilledFreePos: undefined } }
              : {}),
          });
        }
      });

      // Places a cell at row-major grid index `index`, advancing the running
      // row cursor (y / rowMaxHeight); returns the cell's top-left.
      let y = NETWORK_FRAME_HEADER + NETWORK_FRAME_PADDING_Y;
      let rowMaxHeight = 0;
      const placeCell = (index: number, cellHeight: number) => {
        const col = index % cols;
        if (col === 0 && index > 0) {
          y += drilled
            ? DRILLED_RESOURCE_SPACING
            : rowMaxHeight + NETWORK_FRAME_ROW_GAP;
          rowMaxHeight = 0;
        }
        rowMaxHeight = Math.max(rowMaxHeight, cellHeight);
        return {
          x: NETWORK_FRAME_PADDING_X + col * (childWidth + NETWORK_FRAME_GAP),
          y,
        };
      };

      visibleResources.forEach((child, index) => {
        // Parent-view rows occupy FIXED slots (fallback height, not the
        // measured size): measured heights land one commit after mount, and
        // re-laying out per measurement made rows and the "+N more" cell
        // visibly shift while re-rendering every frame (lag). The row node
        // itself is stamped to the slot height so visuals match geometry.
        const desired = placeCell(
          index,
          drilled
            ? child.measured?.height ?? NETWORK_FRAME_FALLBACK_ROW
            : NETWORK_FRAME_FALLBACK_ROW,
        );
        const childUpdate: Partial<Node> = {};
        if (child.hidden) childUpdate.hidden = false;
        // Parent-view rows are frame-managed: keep them out of rubber-band
        // selection (a full-width row is caught by any graze — phantom members
        // in Create Group). Drilled cards are individual, auto-width nodes, so
        // they ARE selectable — that powers "select resources → Create Group"
        // in the single-network view.
        if (child.selectable !== drilled) childUpdate.selectable = drilled;
        // A drilled resource the user dragged holds its own position (it
        // renders standalone, like the live single-network view) — don't snap
        // it back to the grid slot. In the parent view the row is grid-managed
        // again, so the marker is dropped and the slot position restored.
        const freePos = drilled && !!child.data?.drilledFreePos;
        if (
          !freePos &&
          (child.position.x !== desired.x || child.position.y !== desired.y)
        ) {
          childUpdate.position = desired;
        }
        // Drilled: pin each child after its FIRST placement (drilled slots are
        // a fixed pitch, so the initial position is final) — later reconciles
        // then leave it alone, so moving or absorbing a sibling never re-grids
        // the rest. The parent view drops the marker and re-grids.
        if (drilled && !freePos) {
          childUpdate.data = {
            ...(childUpdate.data ?? child.data),
            drilledFreePos: true,
          };
        } else if (!drilled && child.data?.drilledFreePos) {
          childUpdate.data = { ...child.data, drilledFreePos: undefined };
        }
        // Sync the width/height and clear any stale fade mask left by the
        // old overflow treatment (rows are solid; overflow is a "+N more"
        // cell). Drilled cards auto-size like live/standalone ones
        // (min-width from the card itself) — no forced size.
        const desiredWidth = drilled ? undefined : childWidth;
        const desiredHeight = drilled ? undefined : NETWORK_FRAME_FALLBACK_ROW;
        if (
          child.style?.width !== desiredWidth ||
          child.style?.height !== desiredHeight ||
          child.style?.maskImage
        ) {
          childUpdate.style = {
            ...child.style,
            width: desiredWidth,
            height: desiredHeight,
            maskImage: undefined,
            WebkitMaskImage: undefined,
          };
        }
        if (Object.keys(childUpdate).length > 0) {
          updates.set(child.id, childUpdate);
        }
      });

      // The "+N more" cell takes the slot after the last visible resource. It
      // adopts its row sibling's measured height (so the row isn't inflated to
      // the fallback), or the fallback when it starts a fresh row. NetworkNode
      // renders it from this frame-relative rect (a resource row's box);
      // placing it advances the row cursor, so the height below accounts for it.
      const moreCell: FrameMoreCell | undefined = hasMore
        ? (() => {
            const sharesRow = visibleResources.length % cols > 0;
            const cellHeight = sharesRow
              ? rowMaxHeight
              : NETWORK_FRAME_FALLBACK_ROW;
            return {
              ...placeCell(visibleResources.length, cellHeight),
              width: childWidth,
              height: cellHeight,
              count: moreCount,
            };
          })()
        : undefined;

      // Bottom band: the "Add Resource" button is present in BOTH modes now
      // (live adds against the real API), so its band is always reserved
      // (overflow lives in-grid as the "+N more" cell, not a footer).
      const addBand = NETWORK_FRAME_ADD_ROW;
      // Empty frames reserve one row (getNetworkFrameHeight) so they're the
      // same height as one/two resources.
      const height =
        visibleResources.length > 0
          ? y + rowMaxHeight + addBand
          : getNetworkFrameHeight(0);

      const frameUpdate: Partial<Node> = {};
      if (frame.style?.height !== height || frame.style?.width !== width) {
        frameUpdate.style = { ...frame.style, width, height };
      }
      // Keep the frame on its own z-layer so a plain node (peer, user device,
      // …) can never render BETWEEN the frame box and its resource children
      // (ReactFlow gives children parentZ + 1). Frames sit at FRAME_Z (≥ 1),
      // children at FRAME_Z + 1 — both above default (0) nodes, so those stay
      // fully behind. Drag/drop elevations (≥ FRAME_Z) are left alone.
      if (
        frame.zIndex === undefined ||
        (typeof frame.zIndex === "number" &&
          frame.zIndex < FRAME_Z &&
          frame.zIndex !== 1000)
      ) {
        frameUpdate.zIndex = FRAME_Z;
      }
      const prevMore = (frame.data as { moreCell?: FrameMoreCell }).moreCell;
      if (!sameMoreCell(prevMore, moreCell)) {
        frameUpdate.data = { ...frame.data, moreCell };
      }
      if (Object.keys(frameUpdate).length > 0) {
        updates.set(frame.id, frameUpdate);
      }
    });

    if (updates.size === 0 && obsolete.size === 0) {
      return;
    }
    setNodes((prev) =>
      prev
        .filter((n) => !obsolete.has(n.id))
        .map((n) => {
          const update = updates.get(n.id);
          return update ? { ...n, ...update } : n;
        }),
    );
  }, [nodes, setNodes, isDraft, drillDownNetworkNodeId]);
}

import { useEffect } from "react";
import { Node } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
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

// Children render at parentZ + 1, so no plain node (z 0) slips between a frame
// and its resources.
const FRAME_Z = 1;

// Frame-relative rect NetworkNode overlays once resources overflow the cap.
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

// Only writes on actual drift, so the layout settles once ReactFlow measures.
export function useNetworkFrameLayout() {
  const { nodes, setNodes } = useCanvasState();
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    // Membership lands on drag stop, so skip the reconcile per pointer-move tick.
    if (nodes.some((n) => n.dragging)) return;
    const frames = nodes.filter(isFrameNode);
    if (frames.length === 0) return;

    const updates = new Map<string, Partial<Node>>();

    frames.forEach((frame) => {
      // Writing to a non-drilled frame would fight the drill-down's hidden flags.
      if (drillDownNetworkNodeId && frame.id !== drillDownNetworkNodeId) {
        return;
      }
      // A hidden frame with no drill is mid-exit: re-laying its children now
      // would yank the still-shown drilled cards.
      if (frame.hidden && frame.id !== drillDownNetworkNodeId) {
        return;
      }
      // The drill id is set before the zoom-in, so the frame keeps its parent
      // look until the swap hides it.
      const drilled = frame.id === drillDownNetworkNodeId && !!frame.hidden;
      const resources = nodes.filter((n) => n.parentId === frame.id);
      // Drilled keeps insertion order: sorting by position lets one moved card
      // reshuffle every other grid index.
      if (!drilled) {
        resources.sort(
          (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
        );
      }

      // Past the cap the last cell becomes "+N more", so one resource yields
      // its slot; the drill-down shows everything.
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

      const cellCount = visibleResources.length + (hasMore ? 1 : 0);
      // Drilled uses the drilled layout's FIXED pitch, pixel-identical to live.
      const cols = drilled ? 1 : cellCount > 1 ? 2 : 1;
      // A lone resource spans both columns so the frame doesn't jump as the
      // first resources land.
      const sparse = !drilled && resources.length <= 1;
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
        // Parent-view rows use FIXED slot heights: measured heights land a
        // commit later, so re-laying out per measurement shifts rows.
        const desired = placeCell(
          index,
          drilled
            ? child.measured?.height ?? NETWORK_FRAME_FALLBACK_ROW
            : NETWORK_FRAME_FALLBACK_ROW,
        );
        const childUpdate: Partial<Node> = {};
        if (child.hidden) childUpdate.hidden = false;
        // A full-width parent row grazed by a rubber-band selection yields
        // phantom Create-Group members.
        if (child.selectable !== drilled) childUpdate.selectable = drilled;
        // A dragged drilled resource holds its own position.
        const freePos = drilled && !!child.data?.drilledFreePos;
        if (
          !freePos &&
          (child.position.x !== desired.x || child.position.y !== desired.y)
        ) {
          childUpdate.position = desired;
        }
        // Pin each drilled child after its FIRST placement, so touching a
        // sibling never re-grids the rest.
        if (drilled && !freePos) {
          childUpdate.data = {
            ...(childUpdate.data ?? child.data),
            drilledFreePos: true,
          };
        } else if (!drilled && child.data?.drilledFreePos) {
          childUpdate.data = { ...child.data, drilledFreePos: undefined };
        }
        // Drilled cards auto-size like standalone ones, so no forced size.
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

      // The cell adopts its row sibling's height so the row isn't inflated to
      // the fallback.
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

      const addBand = NETWORK_FRAME_ADD_ROW;
      // Empty frames reserve one row so they match the one-resource height.
      const height =
        visibleResources.length > 0
          ? y + rowMaxHeight + addBand
          : getNetworkFrameHeight(0);

      const frameUpdate: Partial<Node> = {};
      if (frame.style?.height !== height || frame.style?.width !== width) {
        frameUpdate.style = { ...frame.style, width, height };
      }
      if (
        frame.zIndex === undefined ||
        (typeof frame.zIndex === "number" && frame.zIndex < FRAME_Z)
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

    if (updates.size === 0) {
      return;
    }
    setNodes((prev) =>
      prev.map((n) => {
        const update = updates.get(n.id);
        return update ? { ...n, ...update } : n;
      }),
    );
  }, [nodes, setNodes, drillDownNetworkNodeId]);
}

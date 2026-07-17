import { useEffect } from "react";
import { Node } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import {
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_FALLBACK_ROW,
  NETWORK_FRAME_GAP,
  NETWORK_FRAME_HEADER,
  NETWORK_FRAME_INSET,
  NETWORK_FRAME_MAX_VISIBLE,
  NETWORK_FRAME_OVERFLOW_ROW,
  getNetworkFrameHeight,
  getNetworkFrameWidth,
} from "@/modules/control-center/utils/helpers";

// Lays out network frames from MEASURED child heights: resources fill a
// row-major grid under the header (column count targets a viewport-shaped
// frame, see getFrameGridColumns) with a uniform 16px inset on the
// left/right/bottom; the frame grows/shrinks to fit exactly. Runs as a
// reconciling effect — it only writes when a position/size actually
// drifted, so it settles immediately after ReactFlow reports dimensions.
export function useNetworkFrameLayout() {
  const { nodes, setNodes } = useCanvasState();

  useEffect(() => {
    const frames = nodes.filter((n) => n.id.startsWith("network-new-"));
    if (frames.length === 0) return;

    const updates = new Map<string, Partial<Node>>();

    frames.forEach((frame) => {
      // Stable grid order: current row, then column.
      const children = nodes
        .filter((n) => n.parentId === frame.id)
        .sort(
          (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
        );

      // Parent view: 2 columns, max 4 rows — overflow children are hidden
      // (the frame shows "+N more"; the drill-down will list everything).
      const visible = children.slice(0, NETWORK_FRAME_MAX_VISIBLE);
      const overflow = children.slice(NETWORK_FRAME_MAX_VISIBLE);
      const cols = visible.length > 1 ? 2 : 1;
      const width = getNetworkFrameWidth(cols);

      overflow.forEach((child) => {
        if (!child.hidden) updates.set(child.id, { hidden: true });
      });

      let y = NETWORK_FRAME_HEADER;
      let rowMaxHeight = 0;
      visible.forEach((child, index) => {
        const col = index % cols;
        if (col === 0 && index > 0) {
          y += rowMaxHeight + NETWORK_FRAME_GAP;
          rowMaxHeight = 0;
        }
        const desired = {
          x:
            NETWORK_FRAME_INSET +
            col * (NETWORK_FRAME_CHILD_WIDTH + NETWORK_FRAME_GAP),
          y,
        };
        const childUpdate: Partial<Node> = {};
        if (child.hidden) childUpdate.hidden = false;
        if (
          child.position.x !== desired.x ||
          child.position.y !== desired.y
        ) {
          childUpdate.position = desired;
        }
        if (child.style?.width !== NETWORK_FRAME_CHILD_WIDTH) {
          childUpdate.style = {
            ...child.style,
            width: NETWORK_FRAME_CHILD_WIDTH,
          };
        }
        if (Object.keys(childUpdate).length > 0) {
          updates.set(child.id, childUpdate);
        }
        rowMaxHeight = Math.max(
          rowMaxHeight,
          child.measured?.height ?? NETWORK_FRAME_FALLBACK_ROW,
        );
      });

      const height =
        visible.length > 0
          ? y +
            rowMaxHeight +
            (overflow.length > 0 ? NETWORK_FRAME_OVERFLOW_ROW : 0) +
            NETWORK_FRAME_INSET
          : getNetworkFrameHeight(0);
      if (frame.style?.height !== height || frame.style?.width !== width) {
        updates.set(frame.id, {
          style: { ...frame.style, width, height },
        });
      }
    });

    if (updates.size === 0) return;
    setNodes((prev) =>
      prev.map((n) => {
        const update = updates.get(n.id);
        return update ? { ...n, ...update } : n;
      }),
    );
  }, [nodes, setNodes]);
}

import { useEffect } from "react";
import { Node } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_CHILD_WIDTH_MULTI,
  getFrameChildPosition,
  NETWORK_FRAME_FALLBACK_ROW,
  NETWORK_FRAME_GAP,
  NETWORK_FRAME_HEADER,
  NETWORK_FRAME_PADDING_X,
  NETWORK_FRAME_PADDING_Y,
  NETWORK_FRAME_MAX_VISIBLE,
  NETWORK_FRAME_ROW_GAP,
  getFrameGridColumns,
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
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    const frames = nodes.filter((n) => n.id.startsWith("network-new-"));
    if (frames.length === 0) return;

    const updates = new Map<string, Partial<Node>>();
    const missingAddRows: Node[] = [];

    frames.forEach((frame) => {
      // While a frame is drilled, the others are hidden and frozen — writing
      // to them would fight the drill-down's hidden flags.
      if (drillDownNetworkNodeId && frame.id !== drillDownNetworkNodeId) {
        return;
      }
      const drilled = frame.id === drillDownNetworkNodeId;
      // Stable grid order: current row, then column — the "Add Resource" row
      // is pinned last.
      const isAddRow = (n: Node) =>
        n.type === NodeType.AddNetworkResourceNode;
      const children = nodes
        .filter((n) => n.parentId === frame.id)
        .sort((a, b) => {
          if (isAddRow(a) !== isAddRow(b)) return isAddRow(a) ? 1 : -1;
          return a.position.y - b.position.y || a.position.x - b.position.x;
        });

      // The add-row is ALWAYS present (reconciled here so every path — drop,
      // assign, context menu, restore, and a freshly-added empty network —
      // gets it); an empty frame shows just the add-row, never a text hint.
      const resourceChildren = children.filter((n) => !isAddRow(n));
      const addRow = children.find(isAddRow);
      if (!addRow) {
        missingAddRows.push({
          id: `add-resource-${frame.id}`,
          type: NodeType.AddNetworkResourceNode,
          parentId: frame.id,
          position: getFrameChildPosition(resourceChildren.length),
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          data: {},
        });
      }

      // Parent view: the visible cap applies to RESOURCES only — the
      // "Add Resource" row is always appended after them, never hidden.
      // Overflow hides behind the fade; the drill-down shows everything in
      // a square-ish grid instead.
      const visibleResources = drilled
        ? resourceChildren
        : resourceChildren.slice(0, NETWORK_FRAME_MAX_VISIBLE);
      const overflow = drilled
        ? []
        : resourceChildren.slice(NETWORK_FRAME_MAX_VISIBLE);
      const visible = addRow
        ? [...visibleResources, addRow]
        : visibleResources;
      // Row-major fill: left → right, then the next row (a single resource
      // gets the add-row at its right, not below).
      const cols = drilled
        ? getFrameGridColumns(children.length)
        : visible.length > 1
        ? 2
        : 1;
      // Multi-column rows hug their content; single-column rows span the
      // frame's card width.
      const childWidth =
        cols > 1 ? NETWORK_FRAME_CHILD_WIDTH_MULTI : NETWORK_FRAME_CHILD_WIDTH;
      const width = getNetworkFrameWidth(cols, childWidth);

      overflow.forEach((child) => {
        if (!child.hidden) updates.set(child.id, { hidden: true });
      });

      // With hidden overflow the last visible RESOURCE row fades out
      // (live-mode look) — a CSS mask on the row's nodes, since an overlay
      // inside the frame would paint UNDER its child nodes. The add-row
      // stays solid.
      const lastResourceRowFirstIndex =
        cols * Math.floor((visibleResources.length - 1) / cols);

      let y = NETWORK_FRAME_HEADER + NETWORK_FRAME_PADDING_Y;
      let rowMaxHeight = 0;
      visible.forEach((child, index) => {
        const col = index % cols;
        if (col === 0 && index > 0) {
          y += rowMaxHeight + NETWORK_FRAME_ROW_GAP;
          rowMaxHeight = 0;
        }
        const desired = {
          x:
            NETWORK_FRAME_PADDING_X +
            col * (childWidth + NETWORK_FRAME_GAP),
          y,
        };
        const fadeMask =
          overflow.length > 0 &&
          index < visibleResources.length &&
          index >= lastResourceRowFirstIndex
            ? "linear-gradient(to bottom, black 10%, transparent 95%)"
            : undefined;
        const childUpdate: Partial<Node> = {};
        if (child.hidden) childUpdate.hidden = false;
        if (
          child.position.x !== desired.x ||
          child.position.y !== desired.y
        ) {
          childUpdate.position = desired;
        }
        if (
          child.style?.width !== childWidth ||
          child.style?.maskImage !== fadeMask
        ) {
          childUpdate.style = {
            ...child.style,
            width: childWidth,
            maskImage: fadeMask,
            WebkitMaskImage: fadeMask,
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
          ? y + rowMaxHeight + NETWORK_FRAME_PADDING_Y
          : getNetworkFrameHeight(0);
      if (frame.style?.height !== height || frame.style?.width !== width) {
        updates.set(frame.id, {
          style: { ...frame.style, width, height },
        });
      }
    });

    if (updates.size === 0 && missingAddRows.length === 0) {
      return;
    }
    setNodes((prev) =>
      prev
        .map((n) => {
          const update = updates.get(n.id);
          return update ? { ...n, ...update } : n;
        })
        .concat(missingAddRows),
    );
  }, [nodes, setNodes, drillDownNetworkNodeId]);
}

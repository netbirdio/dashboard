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
  NETWORK_FRAME_OVERFLOW_ROW,
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
// Adding resources happens from the frame header's "Add Resource" button, and
// overflow past the visible cap is summarized by NetworkNode's "+N More"
// footer — so the frame's only children are resource nodes.
export function useNetworkFrameLayout() {
  const { nodes, setNodes } = useCanvasState();
  const { drillDownNetworkNodeId } = useDraftMode();

  useEffect(() => {
    const frames = nodes.filter((n) => n.id.startsWith("network-new-"));
    if (frames.length === 0) return;

    const updates = new Map<string, Partial<Node>>();
    // Legacy utility children from older drafts: the "Add Resource" row moved
    // to the frame header and the overflow row became a footer, so any
    // persisted ones are swept off the canvas.
    const obsolete = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.parentId?.startsWith("network-new-") &&
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
      const drilled = frame.id === drillDownNetworkNodeId;
      const resources = nodes
        .filter((n) => n.parentId === frame.id && !obsolete.has(n.id))
        .sort(
          (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
        );

      // Parent view caps visible resources; overflow is hidden and summarized
      // by NetworkNode's "+N More" footer. The drill-down shows everything in
      // a square-ish grid, so there's no overflow while drilled.
      const visibleResources = drilled
        ? resources
        : resources.slice(0, NETWORK_FRAME_MAX_VISIBLE);
      const overflow = drilled
        ? 0
        : Math.max(0, resources.length - NETWORK_FRAME_MAX_VISIBLE);

      const cols = drilled
        ? getFrameGridColumns(resources.length)
        : visibleResources.length > 1
        ? 2
        : 1;
      // Multi-column rows hug their content; single-column rows span the
      // frame's card width.
      const childWidth =
        cols > 1 ? NETWORK_FRAME_CHILD_WIDTH_MULTI : NETWORK_FRAME_CHILD_WIDTH;
      const width = getNetworkFrameWidth(cols, childWidth);

      resources.slice(visibleResources.length).forEach((child) => {
        if (!child.hidden) updates.set(child.id, { hidden: true });
      });

      let y = NETWORK_FRAME_HEADER + NETWORK_FRAME_PADDING_Y;
      let rowMaxHeight = 0;
      visibleResources.forEach((child, index) => {
        const col = index % cols;
        if (col === 0 && index > 0) {
          y += rowMaxHeight + NETWORK_FRAME_ROW_GAP;
          rowMaxHeight = 0;
        }
        const desired = {
          x: NETWORK_FRAME_PADDING_X + col * (childWidth + NETWORK_FRAME_GAP),
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
        // Sync the width and clear any stale fade mask left by the old
        // overflow treatment (rows are solid now; overflow is summarized by
        // the "+N More" footer instead).
        if (child.style?.width !== childWidth || child.style?.maskImage) {
          childUpdate.style = {
            ...child.style,
            width: childWidth,
            maskImage: undefined,
            WebkitMaskImage: undefined,
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

      // Reserve a band at the bottom for the "+N More" footer NetworkNode
      // renders when resources overflow the visible cap.
      const overflowBand = overflow > 0 ? NETWORK_FRAME_OVERFLOW_ROW : 0;
      const height =
        visibleResources.length > 0
          ? y + rowMaxHeight + NETWORK_FRAME_PADDING_Y + overflowBand
          : getNetworkFrameHeight(0);
      if (frame.style?.height !== height || frame.style?.width !== width) {
        updates.set(frame.id, {
          style: { ...frame.style, width, height },
        });
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
  }, [nodes, setNodes, drillDownNetworkNodeId]);
}

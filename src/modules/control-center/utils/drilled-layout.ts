import { Edge, Node } from "@xyflow/react";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import { getFrameChildPosition } from "@/modules/control-center/utils/helpers";

// THE single-network ("drilled") layout — one definition shared by every way
// of looking at one network: the live single-network view, the draft
// drill-down (clicked from the draft canvas), and entering draft from the
// live drilled view. Groups/peers left, policies middle, the resource column
// right at a fixed pitch.
export const DRILLED_RESOURCE_SPACING = 95;

const DRILLED_LAYOUT_CONFIG = {
  ...DEFAULT_LAYOUT_CONFIG,
  peersAndResources: {
    ...DEFAULT_LAYOUT_CONFIG.peersAndResources,
    spacing: DRILLED_RESOURCE_SPACING,
  },
};

export const applyDrilledLayout = (nodes: Node[], edges: Edge[]) => {
  // The layout stacks each column in ARRAY order, and live vs draft build
  // their arrays differently (policy iteration vs draft canvas order) — sort
  // the group columns by name so both views agree. In-place slot swap: only
  // group nodes move relative to each other, everything else keeps its index
  // (parents stay before children).
  const groupName = (n: Node) =>
    (n.data as { group?: { name?: string } })?.group?.name ?? "";
  const arranged = [...nodes];
  for (const type of ["groupNode", "destinationGroupNode"]) {
    const slots = arranged
      .map((n, i) => ({ n, i }))
      .filter((x) => x.n.type === type);
    const sorted = [...slots].sort((a, b) =>
      groupName(a.n).localeCompare(groupName(b.n)),
    );
    slots.forEach((slot, k) => {
      arranged[slot.i] = sorted[k].n;
    });
  }
  return applyD3HierarchicalLayout(
    arranged,
    edges,
    400,
    120,
    "network",
    DRILLED_LAYOUT_CONFIG,
  );
};

// Where the (hidden) frame must sit so its FIRST child cell lands exactly on
// the layout's resource-column start — the draft drill-down places resources
// as frame children, the live view as top-level column nodes; this keeps the
// two pixel-identical.
export const getDrilledFrameAnchor = (resourceCount: number) => {
  const firstCell = getFrameChildPosition(0);
  return {
    x: DEFAULT_LAYOUT_CONFIG.peersAndResources.width - firstCell.x,
    y:
      // The layout centers the network/resource column at centerY + 5
      // (see applyD3HierarchicalLayout's "Networks" column) — mirror it.
      5 -
      ((Math.max(resourceCount, 1) - 1) * DRILLED_RESOURCE_SPACING) / 2 -
      firstCell.y,
  };
};

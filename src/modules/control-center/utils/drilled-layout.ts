import { Edge, Node } from "@xyflow/react";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import { getFrameChildPosition } from "@/modules/control-center/utils/helpers";

// The one single-network ("drilled") layout, shared by the live
// single-network view and the draft drill-down so both stay identical.
export const DRILLED_RESOURCE_SPACING = 95;

const DRILLED_LAYOUT_CONFIG = {
  ...DEFAULT_LAYOUT_CONFIG,
  peersAndResources: {
    ...DEFAULT_LAYOUT_CONFIG.peersAndResources,
    spacing: DRILLED_RESOURCE_SPACING,
  },
};

export const applyDrilledLayout = (nodes: Node[], edges: Edge[]) => {
  // The layout stacks each column in array order and live vs draft build their
  // arrays differently, so name-sort the group columns to make both agree.
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

// Where the hidden frame must sit so its first child cell lands exactly on the
// layout's resource-column start, keeping draft and live pixel-identical.
export const getDrilledFrameAnchor = (resourceCount: number) => {
  const firstCell = getFrameChildPosition(0);
  return {
    x: DEFAULT_LAYOUT_CONFIG.peersAndResources.width - firstCell.x,
    y:
      // Mirrors applyD3HierarchicalLayout, which centers the column at
      // centerY + 5.
      5 -
      ((Math.max(resourceCount, 1) - 1) * DRILLED_RESOURCE_SPACING) / 2 -
      firstCell.y,
  };
};

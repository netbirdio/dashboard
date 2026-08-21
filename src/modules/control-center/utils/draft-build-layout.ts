import { Edge, Node } from "@xyflow/react";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import {
  FRAME_GRID_BASE_X,
  SOURCE_NODE_HALF_HEIGHT,
  isFrameNode,
  packFrameGrid,
} from "@/modules/control-center/utils/helpers";

// Fresh rebuild nodes aren't measured yet, hence the fallback chain.
const nodeRect = (n: Node) => {
  const width =
    n.measured?.width ?? n.initialWidth ?? (Number(n.style?.width) || 250);
  const height =
    n.measured?.height ?? n.initialHeight ?? (Number(n.style?.height) || 80);
  return { x: n.position.x, y: n.position.y, width, height };
};

const rectsIntersect = (
  a: ReturnType<typeof nodeRect>,
  b: ReturnType<typeof nodeRect>,
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

// Push-apart distance only: detection stays exact intersection, so the tight
// column rhythms are never "resolved" apart.
const OVERLAP_MARGIN = 40;

// The x every live view uses, so a draft reproduces it exactly.
const DEST_COLUMN_X = 1000;
const DEST_COLUMN_FRAME_GAP = 200;

export const resolveNodeOverlaps = (nodes: Node[]) => {
  const movable = nodes.filter((n) => !n.parentId && !n.hidden);
  const area = (n: Node) => {
    const r = nodeRect(n);
    return r.width * r.height;
  };
  const ordered = [...movable].sort((a, b) => area(b) - area(a));
  const placed: Node[] = [];
  ordered.forEach((node) => {
    for (let guard = 0; guard < 50; guard++) {
      const rect = nodeRect(node);
      const hit = placed.find((p) => rectsIntersect(rect, nodeRect(p)));
      if (!hit) break;
      const other = nodeRect(hit);
      const candidates = [
        { dx: other.x + other.width + OVERLAP_MARGIN - rect.x, dy: 0 },
        { dx: other.x - rect.width - OVERLAP_MARGIN - rect.x, dy: 0 },
        { dx: 0, dy: other.y + other.height + OVERLAP_MARGIN - rect.y },
        { dx: 0, dy: other.y - rect.height - OVERLAP_MARGIN - rect.y },
      ].sort(
        (a, b) => Math.abs(a.dx + a.dy) - Math.abs(b.dx + b.dy),
      );
      const move = candidates[0];
      node.position = {
        x: node.position.x + move.dx,
        y: node.position.y + move.dy,
      };
    }
    placed.push(node);
  });
};

// Arranging an untouched draft must reproduce the live view it came from.
export const applyDraftBuildLayout = (
  allNodes: Node[],
  allEdges: Edge[],
  liveNodes: Node[] = [],
) => {
  // Frame children stay out of the layout: their positions are frame-relative.
  const frameChildren = allNodes.filter((n) => n.parentId);
  const carriesFrames = allNodes.some((n) => isFrameNode(n));
  const baseSpacing = carriesFrames ? 160 : 120;
  const { updatedNodes, updatedEdges } = applyD3HierarchicalLayout(
    allNodes.filter((n) => !n.parentId),
    allEdges,
    400,
    baseSpacing,
    "peer",
    carriesFrames
      ? { ...DEFAULT_LAYOUT_CONFIG, policy: { width: 500, spacing: 90 } }
      : DEFAULT_LAYOUT_CONFIG,
  );
  // Edge direction tells a node's side; the layout only buckets by TYPE, so a
  // destination peer would otherwise be stacked with the sources.
  const policyNodeIds = new Set(
    updatedNodes.filter((n) => n.type === "policyNode").map((n) => n.id),
  );
  const destinationIds = new Set(
    updatedEdges
      .filter((e) => policyNodeIds.has(e.source))
      .map((e) => e.target),
  );
  // Groups and source peers stack as ONE column like live.
  const sourceColumn = updatedNodes.filter(
    (n) =>
      !n.parentId &&
      !isFrameNode(n) &&
      (n.type === "groupNode" || n.type === "peerNode") &&
      !destinationIds.has(n.id) &&
      n.position.x < 240,
  );
  const draftDisplayName = (n: Node) => {
    const d = n.data as { group?: { name?: string }; peer?: { name?: string } };
    return (d?.group?.name ?? d?.peer?.name ?? "").toLowerCase();
  };
  if (sourceColumn.length > 0) {
    // Name-sorted like the live overview.
    sourceColumn.sort((a, b) =>
      draftDisplayName(a).localeCompare(draftDisplayName(b)),
    );
    // Same pitch as the destination column; frame drafts keep the overview one.
    const sourcePitch = carriesFrames ? baseSpacing : 100;
    const colHeight = (sourceColumn.length - 1) * sourcePitch;
    sourceColumn.forEach((n, i) => {
      n.position = { x: 0, y: -colHeight / 2 + i * sourcePitch };
    });
  }
  if (carriesFrames) {
    // Frameless drafts already match live via DEFAULT_LAYOUT_CONFIG.
    const policyColumn = updatedNodes.filter(
      (n) => !n.parentId && n.type === "policyNode",
    );
    if (policyColumn.length > 0) {
      const policyName = (n: Node) =>
        ((n.data as { policy?: { name?: string } })?.policy?.name ?? "")
          .toLowerCase();
      policyColumn.sort((a, b) => policyName(a).localeCompare(policyName(b)));
      const colHeight = (policyColumn.length - 1) * 90;
      policyColumn.forEach((n, i) => {
        n.position = {
          x: 500,
          y: -colHeight / 2 + i * 90 + 14,
        };
      });
    }
  }

  // Live centers destination groups and resources as ONE column.
  const destColumn = updatedNodes.filter(
    (n) =>
      !n.parentId &&
      !isFrameNode(n) &&
      destinationIds.has(n.id) &&
      (n.type === "destinationGroupNode" ||
        n.type === "groupNode" ||
        n.type === "resourceNode" ||
        n.type === "peerNode"),
  );
  if (destColumn.length > 0) {
    // Ordered by the first policy that targets the node, NOT creation order.
    const rank = (n: Node) =>
      n.type === "destinationGroupNode" || n.type === "groupNode" ? 0 : 1;
    const firstDestEdgeIndex = new Map<string, number>();
    updatedEdges.forEach((e, i) => {
      if (policyNodeIds.has(e.source) && !firstDestEdgeIndex.has(e.target))
        firstDestEdgeIndex.set(e.target, i);
    });
    destColumn.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (firstDestEdgeIndex.get(a.id) ?? 0) -
          (firstDestEdgeIndex.get(b.id) ?? 0),
    );
    const colHeight = (destColumn.length - 1) * 100;
    destColumn.forEach((n, i) => {
      n.position = { x: DEST_COLUMN_X, y: -colHeight / 2 + i * 100 };
    });
  }

  // Staggered so the policy edges flow through the gaps between frames.
  const frames = updatedNodes.filter((n) => isFrameNode(n));
  if (frames.length > 0) {
    // A FIXED midline like live: deriving it from measured boxes landed a few
    // px off and shifted the columns on the mode switch.
    packFrameGrid(
      frames,
      destColumn.length > 0
        ? Math.max(
            FRAME_GRID_BASE_X,
            DEST_COLUMN_X +
              Math.max(...destColumn.map((n) => nodeRect(n).width)) +
              DEST_COLUMN_FRAME_GAP,
          )
        : FRAME_GRID_BASE_X,
      SOURCE_NODE_HALF_HEIGHT,
    );
  }

  resolveNodeOverlaps(updatedNodes);

  // Anchor to the live canvas so the mode switch has no positional drift.
  const liveAnchor = liveNodes.find(
    (n) => n.type === "networkNode" && updatedNodes.some((u) => u.id === n.id),
  );
  if (liveAnchor) {
    const placed = updatedNodes.find((n) => n.id === liveAnchor.id)!;
    const dx = liveAnchor.position.x - placed.position.x;
    const dy = liveAnchor.position.y - placed.position.y;
    updatedNodes.forEach((n) => {
      n.position = { x: n.position.x + dx, y: n.position.y + dy };
    });
  }

  // Parents must precede children.
  updatedNodes.push(...frameChildren);

  return { updatedNodes, updatedEdges };
};

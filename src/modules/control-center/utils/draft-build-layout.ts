import { Edge, Node } from "@xyflow/react";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import {
  FRAME_GRID_BASE_X,
  SOURCE_NODE_HALF_HEIGHT,
  isFrameNode,
  packFrameGrid,
} from "@/modules/control-center/utils/helpers";

// A node's world-space box. Arrange runs on a rendered canvas so nodes are
// measured; fresh rebuild nodes fall back to the adopted live size, a styled
// size, or a conservative guess.
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

// Object-aware overlap pass: the column/grid placement above never stacks
// nodes it KNOWS about, but stragglers outside every column (standalone
// resources in a frames draft, exotic drops) can land on another node. Larger
// nodes (frames) anchor in place; each smaller node that intersects one is
// nudged the shortest way out (left/right/up/down) plus a margin, re-checked
// until it sits clear. Detection is exact intersection — NOT margin-inflated,
// so the tight column rhythms (e.g. 100 pitch vs ~80 tall nodes) are never
// "resolved" apart and an untouched canvas keeps its entry layout verbatim.
const OVERLAP_MARGIN = 40;

// The destination column's x — the same one every live view uses, so a draft
// entered from a peer/group/user view reproduces it exactly.
const DEST_COLUMN_X = 1000;
// Breathing room between that column and the network frame grid behind it.
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
      // Candidate translations that clear the collision, smallest first.
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

// THE draft parent-view layout — one definition shared by the draft rebuild
// (entering draft mode, useDraft) and the toolbar's Auto Arrange, so
// arranging an untouched draft reproduces the entry layout exactly instead
// of drifting to a slightly different rhythm. Mirrors whatever LIVE view the
// draft was entered from: drafts carrying network frames mirror the networks
// overview (sources 160 pitch, policies at x 500 / 90 pitch, staggered frame
// grid); frameless drafts mirror the peer/group/user views' shared layout
// (spacing 120, DEFAULT_LAYOUT_CONFIG — policies 500/60, destinations
// 1000/100).
//
// `liveNodes` (draft rebuild only) supplies the live anchor frame that pins
// the draft to the live canvas position; Auto Arrange passes none — its
// fitView re-centers the camera anyway.
export const applyDraftBuildLayout = (
  allNodes: Node[],
  allEdges: Edge[],
  liveNodes: Node[] = [],
) => {
  // Hierarchical layout: sources → policies → destinations. Frame children
  // stay out of it — their positions are frame-relative and the reconciling
  // frame layout manages them.
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
  // Edge direction tells a node's side: node → policy = source,
  // policy → node = destination (the layout buckets by TYPE, so a
  // destination peer would otherwise be stacked with the sources).
  const policyNodeIds = new Set(
    updatedNodes.filter((n) => n.type === "policyNode").map((n) => n.id),
  );
  const destinationIds = new Set(
    updatedEdges
      .filter((e) => policyNodeIds.has(e.source))
      .map((e) => e.target),
  );
  // Source column: groups AND source peers stack as ONE column (the
  // hierarchical layout centers groupNodes and peerNodes independently
  // at x=0, which overlaps them when both exist) — same combined
  // column as the live view, at its pitch.
  const sourceColumn = updatedNodes.filter(
    (n) =>
      !n.parentId &&
      !isFrameNode(n) &&
      (n.type === "groupNode" || n.type === "peerNode") &&
      !destinationIds.has(n.id) &&
      n.position.x < 240,
  );
  const draftDisplayName = (n: Node) =>
    (
      (n.data as { group?: { name?: string }; peer?: { name?: string } })
        ?.group?.name ??
      (n.data as { peer?: { name?: string } })?.peer?.name ??
      ""
    ).toLowerCase();
  if (sourceColumn.length > 0) {
    // Name-sorted like the live overview.
    sourceColumn.sort((a, b) =>
      draftDisplayName(a).localeCompare(draftDisplayName(b)),
    );
    // Same pitch as the destination column (100) so both sides share one
    // rhythm; frame drafts keep the networks-overview pitch. Top-anchored
    // at x 0 like every live view — the frame grid centers on the columns'
    // midline instead (othersMid below), so nothing hangs low.
    const sourcePitch = carriesFrames ? baseSpacing : 100;
    const colHeight = (sourceColumn.length - 1) * sourcePitch;
    sourceColumn.forEach((n, i) => {
      n.position = { x: 0, y: -colHeight / 2 + i * sourcePitch };
    });
  }
  if (carriesFrames) {
    // Policies column: same name order + rhythm as the live overview
    // (the frameless layout already matches the live views via
    // DEFAULT_LAYOUT_CONFIG).
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

  // Destination column: live views center destination groups AND
  // destination resources as ONE column (x 1000, pitch 100) — the
  // draft build's resources are `resourceNode`s (a separate layout
  // bucket at 1400/80) and destination peers are `peerNode`s (stacked
  // at x=0 with the sources), so restack them together at the live
  // rhythm, keeping the layout's top-to-bottom order.
  // groupNode included: a group that is BOTH a source and a destination
  // dedups into one groupNode — the source restack skips destinations,
  // so without this it would strand at x=0 while the live view shows it
  // in the destination column (visible jump on mode switch).
  // Frame drafts need this just as much: a policy can target a peer, a
  // standalone resource or an unfolded group there too, and those types
  // bucket at x 0 / x 1400 — i.e. on top of the sources or inside the
  // frame grid — until they're restacked here.
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
    // Live concatenates [destination groups, destination resources] —
    // groups on top, resources/peers below; within each block, ordered
    // by the first policy that targets the node (live creates its
    // destination nodes per-policy in that order). NOT node creation
    // order — the draft dedups by entity id, so a node also used as a
    // source elsewhere was created earlier than its live counterpart —
    // and NOT layout y, which is meaningless across layout buckets.
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

  // Arrange the network frames in a STAGGERED GRID on the right instead
  // of one cramped column: rows × cols chosen for a ~1:1 aspect block,
  // odd columns offset by half a cell so the policy edges flow through
  // the gaps between frames.
  const frames = updatedNodes.filter((n) => isFrameNode(n));
  // Also for a SINGLE frame — otherwise it stays at the hierarchical
  // layout's far column and the live-anchor shift below drags the
  // source/policy columns out of line with it.
  if (frames.length > 0) {
    // Same x-origin AND the same FIXED vertical midline as the live
    // overview (packFrameGrid at SOURCE_NODE_HALF_HEIGHT). Deriving the
    // midline from the columns' measured pixel boxes always landed a few
    // px off the live value — and since the scene is then anchored to the
    // live frame position (below), that delta shifted the source/policy
    // columns on every live↔draft switch.
    // The live overview has nothing but frames on the destination side, so
    // it always uses the bare base x; a draft that ALSO has a destination
    // column (frames sit at 1050, the column at 1000) pushes the grid past
    // it so the two don't share the same band.
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

  // Nodes the columns above don't claim (e.g. a standalone resource in a
  // frames draft — its type bucket sits at x 1400, inside the frame grid's
  // territory) can land on top of another node. Resolve any remaining
  // box intersections by nudging the smaller node out of the way.
  resolveNodeOverlaps(updatedNodes);

  // Anchor the draft to the live canvas: shift everything so the first
  // carried network frame keeps its live position — switching modes then
  // has no big positional drift (the layouts differ, but the world stays
  // roughly in place, so the viewport is kept as-is too).
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

  // Parents precede children (all parents are in updatedNodes).
  updatedNodes.push(...frameChildren);

  return { updatedNodes, updatedEdges };
};

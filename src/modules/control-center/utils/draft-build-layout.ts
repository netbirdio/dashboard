import { Edge, Node } from "@xyflow/react";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import {
  FRAME_GRID_BASE_X,
  POLICY_NODE_HALF_HEIGHT,
  SOURCE_NODE_HALF_HEIGHT,
  isFrameNode,
  packFrameGrid,
} from "@/modules/control-center/utils/helpers";

// THE draft parent-view layout — one definition shared by the draft rebuild
// (entering draft mode, useDraft) and the toolbar's Auto Arrange, so
// arranging an untouched draft reproduces the entry layout exactly instead
// of drifting to a slightly different rhythm. Mirrors whatever LIVE view the
// draft was entered from: drafts carrying network frames mirror the networks
// overview (sources 160 pitch, policies at x 480 / 90 pitch, staggered frame
// grid); frameless drafts mirror the peer/group/user views' shared layout
// (spacing 120, DEFAULT_LAYOUT_CONFIG — policies 500/60, destinations
// 1000/100).
//
// `liveNodes` (draft rebuild only) supplies measured sizes for fresh,
// not-yet-measured nodes and the live anchor frame that pins the draft to
// the live canvas position; Auto Arrange runs on measured nodes and passes
// none — its fitView re-centers the camera anyway.
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
      ? { ...DEFAULT_LAYOUT_CONFIG, policy: { width: 480, spacing: 90 } }
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
  if (sourceColumn.length > 1 || (carriesFrames && sourceColumn.length > 0)) {
    // Name-sorted like the live overview.
    sourceColumn.sort((a, b) =>
      draftDisplayName(a).localeCompare(draftDisplayName(b)),
    );
    // Same pitch as the destination column (100) so both sides share
    // one rhythm; frame drafts keep the networks-overview pitch AND its
    // half-height offset (frames center on the midline, so top-anchored
    // columns hang low without it).
    const sourcePitch = carriesFrames ? baseSpacing : 100;
    const halfH = carriesFrames ? SOURCE_NODE_HALF_HEIGHT : 0;
    const colHeight = (sourceColumn.length - 1) * sourcePitch;
    sourceColumn.forEach((n, i) => {
      n.position = { x: 0, y: -colHeight / 2 + i * sourcePitch - halfH };
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
          x: 480,
          y: -colHeight / 2 + i * 90 - POLICY_NODE_HALF_HEIGHT,
        };
      });
    }
  } else {
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
    const destColumn = updatedNodes.filter(
      (n) =>
        !n.parentId &&
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
        n.position = { x: 1000, y: -colHeight / 2 + i * 100 };
      });
    }
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
    // Same x-origin as the live overview (the hierarchical layout put
    // frames at its far column, which left a much wider policy → network
    // gap than live), centered on the vertical middle of the REST of the
    // scene (source groups / policies) — the hierarchical columns aren't
    // guaranteed to center at 0.
    const baseX = FRAME_GRID_BASE_X;
    const others = updatedNodes.filter((n) => !isFrameNode(n) && !n.parentId);
    const othersMid =
      others.length > 0
        ? (Math.min(...others.map((n) => n.position.y)) +
            Math.max(
              ...others.map(
                (n) =>
                  n.position.y +
                  // Fresh rebuild nodes aren't measured yet — fall back
                  // to the live twin's measured height (the adoption
                  // post-pass runs later), else the 80px guess skews the
                  // frame-grid midline vs the columns by ~16px.
                  (n.measured?.height ??
                    n.initialHeight ??
                    liveNodes.find((l) => l.id === n.id)?.measured?.height ??
                    (Number(n.style?.height) || 80)),
              ),
            )) /
          2
        : 5;
    packFrameGrid(frames, baseX, othersMid);
  }

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

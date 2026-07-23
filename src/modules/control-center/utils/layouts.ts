import { Edge, Node } from "@xyflow/react";
import * as d3 from "d3";

interface SimulationNode extends Node {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export const DEFAULT_MAX_ZOOM = 1.6;
export const DEFAULT_MIN_ZOOM = 0.2;
export const EMPTY_STATE_ZOOM = 0.65;

export const applyD3ForceLayout = (nodes: Node[], edges: Edge[]) => {
  const simulationNodes: SimulationNode[] = nodes.map((node) => ({
    ...node,
    x: node.position?.x || 0,
    y: node.position?.y || 0,
  }));

  const simulationLinks = edges.map((edge) => ({
    ...edge,
    source: edge.source,
    target: edge.target,
  }));

  // Apply minimal D3 simulation for final positioning with reduced link distance
  const simulation = d3
    .forceSimulation(simulationNodes)
    .force(
      "link",
      d3
        .forceLink(simulationLinks)
        .id((d: any) => d.id)
        .distance(60) // Reduced distance to minimize crossings
        .strength(0.05), // Reduced strength to maintain radial structure
    )
    .force("collision", d3.forceCollide().radius(300));

  // Run simulation for fewer iterations to preserve radial structure.
  // Stop once alpha decayed past the point of visible movement (~300 ticks)
  // — blindly running 1000 synchronous ticks froze the main thread on views
  // with many nodes.
  simulation.stop();
  for (let i = 0; i < 1000 && simulation.alpha() > 0.005; i++) {
    simulation.tick();
  }

  const updatedNodes: Node[] = simulationNodes.map((node) => ({
    ...node,
    position: {
      x: node.x,
      y: node.y,
    },
  }));

  const updatedEdges: Edge[] = edges.map((edge) => {
    const sourceNode = simulationNodes.find((n) => n.id === edge.source);
    const targetNode = simulationNodes.find((n) => n.id === edge.target);

    return {
      ...edge,
      data: {
        ...edge.data,
        points:
          sourceNode && targetNode
            ? [
                { x: sourceNode.x, y: sourceNode.y },
                { x: targetNode.x, y: targetNode.y },
              ]
            : undefined,
      },
    };
  });

  simulation.stop();

  return { updatedNodes, updatedEdges };
};

export const applyD3HierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  width = 280,
  spacing = 100,
  view?: string,
  options?: {
    policy?: { width: number; spacing: number };
    destinationGroup?: { width: number; spacing: number };
    peersAndResources?: { width: number; spacing: number };
  },
) => {
  const simulationNodes: SimulationNode[] = nodes.map((node) => ({
    ...node,
    x: node.position?.x || 0,
    y: node.position?.y || 0,
  }));

  const columnWidth = width;
  const nodeSpacing = spacing;
  const startX = 0;
  const centerY = 0;

  const sourcePeerNodes = simulationNodes.filter(
    (n) => n.type === "sourcePeerNode",
  );
  const groupNodes = simulationNodes.filter((n) => n.type === "groupNode");
  const sourceGroupNodes = simulationNodes.filter(
    (n) => n.type === "sourceGroupNode",
  );
  const destinationGroupNodes = simulationNodes.filter(
    (n) => n.type === "destinationGroupNode",
  );
  const destinationResourceNodes = simulationNodes.filter(
    (n) => n.type === "destinationResourceNode",
  );
  // The single-group view mirrors policies where the selected group is the
  // destination to the LEFT (sources → policy → selected group); the view
  // stamps those policy nodes with data.side === "left".
  const policyNodes = simulationNodes.filter(
    (n) => n.type === "policyNode" && n.data?.side !== "left",
  );
  const leftPolicyNodes = simulationNodes.filter(
    (n) => n.type === "policyNode" && n.data?.side === "left",
  );
  const networkNodes = simulationNodes.filter((n) => n.type === "networkNode");
  const resourceNodes = simulationNodes.filter(
    (n) => n.type === "resourceNode",
  );
  const peerNodes = simulationNodes.filter((n) => n.type === "peerNode");
  const expandedGroupPeers = simulationNodes.filter(
    (n) => n.type === "expandedGroupPeer",
  );

  let networkAndResourceNodes = [...networkNodes, ...resourceNodes];

  if (view === "group") {
    networkAndResourceNodes = [...networkAndResourceNodes, ...peerNodes];
  }

  if (view === "peer") {
    networkAndResourceNodes = [
      ...networkAndResourceNodes,
      ...expandedGroupPeers,
    ];
  }

  // Source Peer
  centerNodesVertically(
    sourcePeerNodes,
    startX - 100,
    nodeSpacing / 1.5,
    centerY,
  );

  // Peers
  if (peerNodes.length > 0 && view !== "group") {
    centerNodesVertically(
      peerNodes,
      startX + (view === "group" ? columnWidth * 4 : 0),
      nodeSpacing,
      centerY,
    );
  }

  // Groups or Source Groups
  centerNodesVertically(groupNodes, startX, nodeSpacing, centerY);
  if (view === "group") {
    // Mirror image of the destination column: sources of the policies that
    // target the selected group sit on the far left.
    centerNodesVertically(
      sourceGroupNodes,
      startX - (options?.destinationGroup?.width ?? columnWidth),
      options?.destinationGroup?.spacing ?? nodeSpacing,
      centerY,
    );
  } else {
    centerNodesVertically(
      sourceGroupNodes,
      startX + columnWidth,
      nodeSpacing,
      centerY,
    );
  }

  // Policies
  centerNodesVertically(
    policyNodes,
    startX + (options?.policy?.width ?? columnWidth),
    options?.policy?.spacing ?? nodeSpacing,
    centerY + 14,
  );
  centerNodesVertically(
    leftPolicyNodes,
    startX - (options?.policy?.width ?? columnWidth),
    options?.policy?.spacing ?? nodeSpacing,
    centerY + 14,
  );

  // Destination Groups
  centerNodesVertically(
    [...destinationGroupNodes, ...destinationResourceNodes],
    startX + (options?.destinationGroup?.width ?? columnWidth),
    options?.destinationGroup?.spacing ?? nodeSpacing,
    centerY,
  );

  // Networks
  centerNodesVertically(
    networkAndResourceNodes,
    startX + (options?.peersAndResources?.width ?? columnWidth),
    options?.peersAndResources?.spacing ?? nodeSpacing,
    centerY + 5,
  );

  const simulation = d3
    .forceSimulation(simulationNodes)
    .force("charge", d3.forceManyBody().strength(0))
    .force("collision", d3.forceCollide().radius(0))
    .alphaDecay(0.05)
    .velocityDecay(0.7);

  simulation.force("position", (alpha) => {
    simulationNodes.forEach((node) => {
      let targetX = node.x;
      let targetY = node.y;

      const dx = targetX - node.x;
      const dy = targetY - node.y;

      node.vx = (node.vx || 0) + dx * alpha * 0.1;
      node.vy = (node.vy || 0) + dy * alpha * 0.1;
    });
  });

  for (let i = 0; i < 100; i++) {
    simulation.tick();
  }

  const updatedNodes: Node[] = simulationNodes.map((node) => ({
    ...node,
    position: {
      x: node.x,
      y: node.y,
    },
  }));

  const updatedEdges: Edge[] = edges.map((edge) => {
    const sourceNode = simulationNodes.find((n) => n.id === edge.source);
    const targetNode = simulationNodes.find((n) => n.id === edge.target);

    return {
      ...edge,
      data: {
        ...edge.data,
        points:
          sourceNode && targetNode
            ? [
                { x: sourceNode.x, y: sourceNode.y },
                { x: targetNode.x, y: targetNode.y },
              ]
            : undefined,
      },
    };
  });

  simulation.stop();

  return { updatedNodes, updatedEdges };
};

// Auto-arrange for the draft canvas. Unlike applyD3HierarchicalLayout it
// classifies nodes by connectivity, not node type (a sidebar-dropped group is
// a `groupNode` even when it's only used as a destination): policy sources go
// to the left column, policies to the middle, destinations to the right, and
// nodes without any policy connection into their own column on the far left.
// Columns are ordered by the average index of their policy neighbors to
// reduce edge crossings.
export const applyDraftArrangeLayout = (nodes: Node[], edges: Edge[]) => {
  const simulationNodes: SimulationNode[] = nodes.map((node) => ({
    ...node,
    x: node.position?.x || 0,
    y: node.position?.y || 0,
  }));
  const byId = new Map(simulationNodes.map((n) => [n.id, n]));
  const isPolicy = (id: string) => byId.get(id)?.type === "policyNode";
  // Children of network frames don't move themselves (relative positions) —
  // their connectivity counts for the frame instead.
  const resolveToParent = (id: string) => byId.get(id)?.parentId ?? id;

  const policies = simulationNodes.filter((n) => n.type === "policyNode");
  const policyIndex = new Map(policies.map((p, i) => [p.id, i]));

  // node id → indices of the policies it connects to
  const sourceLinks = new Map<string, number[]>();
  const destLinks = new Map<string, number[]>();
  edges.forEach((e) => {
    if (isPolicy(e.target) && !isPolicy(e.source) && byId.has(e.source)) {
      const key = resolveToParent(e.source);
      const list = sourceLinks.get(key) ?? [];
      list.push(policyIndex.get(e.target) ?? 0);
      sourceLinks.set(key, list);
    }
    if (isPolicy(e.source) && !isPolicy(e.target) && byId.has(e.target)) {
      const key = resolveToParent(e.target);
      const list = destLinks.get(key) ?? [];
      list.push(policyIndex.get(e.source) ?? 0);
      destLinks.set(key, list);
    }
  });

  const positionable = simulationNodes.filter((n) => !n.parentId);
  const sources = positionable.filter((n) => sourceLinks.has(n.id));
  const destinations = positionable.filter(
    (n) => destLinks.has(n.id) && !sourceLinks.has(n.id),
  );
  const unconnected = positionable.filter(
    (n) =>
      n.type !== "policyNode" &&
      !sourceLinks.has(n.id) &&
      !destLinks.has(n.id),
  );

  const avg = (list?: number[]) =>
    list && list.length > 0
      ? list.reduce((a, b) => a + b, 0) / list.length
      : 0;
  sources.sort(
    (a, b) => avg(sourceLinks.get(a.id)) - avg(sourceLinks.get(b.id)),
  );
  destinations.sort(
    (a, b) => avg(destLinks.get(a.id)) - avg(destLinks.get(b.id)),
  );

  // Column x positions mirror the draft build layout
  // (applyD3HierarchicalLayout with DEFAULT_LAYOUT_CONFIG); vertical spacing
  // is roomier so nodes with floating Install buttons don't crowd each other.
  centerNodesVertically(unconnected, -450, 160, 0, true, true);
  centerNodesVertically(sources, 0, 160, 0, true, true);
  centerNodesVertically(policies, 500, 80, 14, true, true);
  centerNodesVertically(destinations, 1000, 160, 0, true, true);

  const updatedNodes: Node[] = simulationNodes.map((node) => ({
    ...node,
    position: { x: node.x, y: node.y },
  }));

  const updatedEdges: Edge[] = edges.map((edge) => {
    const sourceNode = byId.get(edge.source);
    const targetNode = byId.get(edge.target);
    return {
      ...edge,
      data: {
        ...edge.data,
        points:
          sourceNode && targetNode
            ? [
                { x: sourceNode.x, y: sourceNode.y },
                { x: targetNode.x, y: targetNode.y },
              ]
            : undefined,
      },
    };
  });

  return { updatedNodes, updatedEdges };
};

// Measured/styled height of a node — network frames are much taller than peer
// or group nodes (and vary with their resource count), so a fixed row pitch
// makes them overlap their neighbours.
const getNodeHeight = (node: SimulationNode) => {
  const measured = node.measured?.height;
  if (typeof measured === "number" && measured > 0) return measured;
  const styled = node.style?.height;
  if (typeof styled === "number" && styled > 0) return styled;
  return 0;
};

const centerNodesVertically = (
  nodesList: SimulationNode[],
  x: number,
  nodeSpacing: number,
  centerY: number,
  enable = true,
  // Height-aware pitch is opt-in (draft auto-arrange only) — the live
  // hierarchical layout uses a fixed pitch so equal-height nodes stay aligned
  // in a straight column.
  heightAware = false,
) => {
  if (nodesList.length === 0) return;

  if (!heightAware) {
    const totalHeight = (nodesList.length - 1) * nodeSpacing;
    const startY = centerY - totalHeight / 2;
    nodesList.forEach((node, index) => {
      node.x = x;
      node.y = (enable ? startY : 0) + index * nodeSpacing;
    });
    return;
  }

  // Each node claims a row at least `nodeSpacing` tall, but a taller node
  // (e.g. a network frame) claims its own height plus a gap so the next node
  // clears it — the gap is generous because frames carry floating controls
  // above them (routing bar) that sit outside the measured box.
  const GAP = 84;
  const pitches = nodesList.map((node) =>
    Math.max(nodeSpacing, getNodeHeight(node) + GAP),
  );
  const totalHeight = pitches.reduce((a, b) => a + b, 0);
  const startY = centerY - totalHeight / 2;

  let cursor = enable ? startY : 0;
  nodesList.forEach((node, index) => {
    node.x = x;
    node.y = cursor;
    cursor += pitches[index];
  });
};

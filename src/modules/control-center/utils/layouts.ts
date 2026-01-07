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

  // Run simulation for fewer iterations to preserve radial structure
  for (let i = 0; i < 1000; i++) {
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
  const policyNodes = simulationNodes.filter((n) => n.type === "policyNode");
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
  centerNodesVertically(
    sourceGroupNodes,
    startX + columnWidth,
    nodeSpacing,
    centerY,
  );

  // Policies
  centerNodesVertically(
    policyNodes,
    startX + (options?.policy?.width ?? columnWidth),
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

const centerNodesVertically = (
  nodesList: SimulationNode[],
  x: number,
  nodeSpacing: number,
  centerY: number,
  enable = true,
) => {
  if (nodesList.length === 0) return;

  const totalHeight = (nodesList.length - 1) * nodeSpacing;
  const startY = centerY - totalHeight / 2;

  nodesList.forEach((node, index) => {
    node.x = x;
    node.y = (enable ? startY : 0) + index * nodeSpacing;
  });
};

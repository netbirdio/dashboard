import { Edge, Node } from "@xyflow/react";

interface SimulationNode extends Node {
  x: number;
  y: number;
}

export const DEFAULT_MAX_ZOOM = 1.6;
export const DEFAULT_MIN_ZOOM = 0.2;
export const EMPTY_STATE_ZOOM = 0.65;

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
  // Agent-network policies share the policy column with access-control ones —
  // both are "what authorizes this" and the overlay mirrors the same
  // source → policy → destination shape.
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

  // Source Peer (user view) — same pitch as the destination column.
  centerNodesVertically(
    sourcePeerNodes,
    startX - 100,
    options?.destinationGroup?.spacing ?? nodeSpacing,
    centerY,
  );

  if (peerNodes.length > 0 && view !== "group") {
    centerNodesVertically(
      peerNodes,
      startX + (view === "group" ? columnWidth * 4 : 0),
      nodeSpacing,
      centerY,
    );
  }

  // Groups or Source Groups — in the peer/group/user views the source column
  // shares the destination column's pitch (one rhythm on both sides, and the
  // draft rebuild mirrors it); the drilled network view keeps the base pitch.
  centerNodesVertically(
    groupNodes,
    startX,
    view === "network"
      ? nodeSpacing
      : options?.destinationGroup?.spacing ?? nodeSpacing,
    centerY,
  );
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

  centerNodesVertically(
    [...destinationGroupNodes, ...destinationResourceNodes],
    startX + (options?.destinationGroup?.width ?? columnWidth),
    options?.destinationGroup?.spacing ?? nodeSpacing,
    centerY,
  );

  centerNodesVertically(
    networkAndResourceNodes,
    startX + (options?.peersAndResources?.width ?? columnWidth),
    options?.peersAndResources?.spacing ?? nodeSpacing,
    centerY + 5,
  );

  // centerNodesVertically already set node.x/node.y — read the placed
  // positions straight out (no simulation needed).
  const updatedNodes: Node[] = simulationNodes.map((node) => ({
    ...node,
    position: { x: node.x, y: node.y },
  }));

  const nodeById = new Map(simulationNodes.map((n) => [n.id, n]));
  const updatedEdges: Edge[] = edges.map((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);

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

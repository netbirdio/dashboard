import { Edge, Node } from "@xyflow/react";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";

/**
 * Push a node into the array only if no node with that id exists.
 * If a node with the same id already exists, merge `node.data` into
 * the existing node's data instead of adding a duplicate.
 */
export function addNode(nodes: Node[], node: Node): void {
  const existing = nodes.find((n) => n.id === node.id);
  if (!existing) {
    nodes.push(node);
  } else {
    existing.data = { ...existing.data, ...node.data };
  }
}

/**
 * Push an edge into the array only if no edge with that id exists.
 * If an edge with the same id already exists, merge `edge.data` into
 * the existing edge's data instead of adding a duplicate.
 */
export function addEdge(edges: Edge[], edge: Edge): void {
  const existing = edges.find((e) => e.id === edge.id);
  if (!existing) {
    edges.push(edge);
  } else {
    existing.data = { ...existing.data, ...edge.data };
  }
}

/**
 * Default layout configuration used across all hierarchical views
 * (peer, group, user, network).
 */
export const DEFAULT_LAYOUT_CONFIG = {
  policy: { width: 500, spacing: 60 },
  destinationGroup: { width: 1000, spacing: 100 },
  peersAndResources: { width: 1400, spacing: 80 },
};

/**
 * Filter peers that belong to a given group.
 */
export function getGroupPeers(peers: Peer[], groupId: string): Peer[] {
  return peers.filter((p) => {
    const peerGroupIds = p.groups?.map((g) => g.id) || [];
    return peerGroupIds.includes(groupId);
  });
}

/**
 * Filter network resources that belong to a given group.
 */
export function getGroupResources(
  resources: NetworkResource[],
  groupId: string,
): NetworkResource[] {
  return resources.filter((r) => {
    const resourceGroupIds =
      r.groups?.map((g) => (g as Group)?.id) || [];
    return resourceGroupIds.includes(groupId);
  });
}

/**
 * Add expanded group content (peers + resources) for a destination group.
 * Used when a destination group is selected/expanded in the graph.
 *
 * @param peerNodeType - The node type for peer nodes (e.g. "peerNode", "expandedGroupPeer")
 * @param peerIdPrefix - The prefix for peer node ids (e.g. "peer-")
 */
export function addExpandedGroupContent(
  allNodes: Node[],
  allEdges: Edge[],
  peers: Peer[],
  networkResources: NetworkResource[],
  destinationGroupId: string,
  enabled: boolean | undefined,
  peerNodeType: string,
  peerIdPrefix: string = "peer-",
): void {
  const resources = getGroupResources(networkResources, destinationGroupId);
  const destinationPeers = getGroupPeers(peers, destinationGroupId);

  destinationPeers.forEach((peer) => {
    const peerNodeId = `${peerIdPrefix}${peer.id}`;
    addNode(allNodes, {
      id: peerNodeId,
      type: peerNodeType,
      data: { peer, enabled },
      position: { x: 0, y: 0 },
    });

    addEdge(allEdges, {
      id: `group-peer-${destinationGroupId}-${peer.id}`,
      source: `group-${destinationGroupId}`,
      target: peerNodeId,
      type: "simple",
      data: { enabled },
    });
  });

  resources.forEach((resource) => {
    const resourceNodeId = `resource-${resource.id}`;
    addNode(allNodes, {
      id: resourceNodeId,
      type: "resourceNode",
      data: { resource, enabled },
      position: { x: 0, y: 0 },
    });

    addEdge(allEdges, {
      id: `group-resource-${destinationGroupId}-${resource.id}`,
      source: `group-${destinationGroupId}`,
      target: resourceNodeId,
      type: "simple",
      data: { enabled },
    });
  });
}

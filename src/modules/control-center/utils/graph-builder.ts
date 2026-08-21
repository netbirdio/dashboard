import { Edge, Node } from "@xyflow/react";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";

// Add a node; if one with the same id already exists, merge `node.data` into
// it rather than duplicating.
export function addNode(nodes: Node[], node: Node): void {
  const existing = nodes.find((n) => n.id === node.id);
  if (!existing) {
    nodes.push(node);
  } else {
    existing.data = { ...existing.data, ...node.data };
  }
}

// Add an edge; if one with the same id already exists, merge `edge.data` into
// it rather than duplicating.
export function addEdge(edges: Edge[], edge: Edge): void {
  const existing = edges.find((e) => e.id === edge.id);
  if (!existing) {
    edges.push(edge);
  } else {
    existing.data = { ...existing.data, ...edge.data };
  }
}

// Default layout config shared by all hierarchical views (peer, group, user, network).
export const DEFAULT_LAYOUT_CONFIG = {
  policy: { width: 500, spacing: 60 },
  destinationGroup: { width: 1000, spacing: 100 },
  peersAndResources: { width: 1400, spacing: 80 },
};

export function getGroupPeers(peers: Peer[], groupId: string): Peer[] {
  return peers.filter((p) => {
    const peerGroupIds = p.groups?.map((g) => g.id) || [];
    return peerGroupIds.includes(groupId);
  });
}

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

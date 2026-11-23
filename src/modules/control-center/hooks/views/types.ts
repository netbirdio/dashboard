import { ExitNode } from "@/interfaces/ExitNode";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Edge, Node } from "@xyflow/react";
import {
  ExitNodeLocation,
  getExitNodeLocations,
  getHighAvailability,
} from "@/modules/exit-nodes/exitNodeHelpers";

export interface ViewResult {
  updatedNodes: Node[];
  updatedEdges: Edge[];
}

/** Thin data of an exit node card; computed here, since nodes can't fetch. */
export type ExitNodeNodeData = {
  id: string;
  name: string;
  // The exit node itself; the policy's state rides on the edge.
  enabled: boolean;
  countries: string[];
  locations: ExitNodeLocation[];
  peerCount: number;
  activePeerCount: number;
  // Not in /exit-nodes: deleted, or the caller can't read exit nodes.
  missing?: boolean;
};

export const exitNodeNodeId = (exitNodeId: string) => `exit-node-${exitNodeId}`;

export function buildExitNodeNodeData(
  exitNodeId: string,
  exitNodes: ExitNode[] | undefined,
  peers: Peer[] | undefined,
): ExitNodeNodeData {
  const exitNode = exitNodes?.find((n) => n.id === exitNodeId);
  if (!exitNode)
    return {
      id: exitNodeId,
      name: "Exit Node",
      enabled: true,
      countries: [],
      locations: [],
      peerCount: 0,
      activePeerCount: 0,
      missing: true,
    };
  const { countries, locations } = getExitNodeLocations(exitNode, peers);
  return {
    id: exitNode.id,
    name: exitNode.name,
    enabled: exitNode.enabled,
    countries,
    locations,
    peerCount: exitNode.peers.length,
    activePeerCount: getHighAvailability(exitNode).activePeerCount,
  };
}

/** An exit-node policy's destination: the exit node card and its edge. */
function addExitNodeDestination(
  policy: Policy,
  exitNodeId: string,
  nodes: Node[],
  edges: Edge[],
  peers: Peer[] | undefined,
  exitNodes: ExitNode[] | undefined,
) {
  const nodeId = exitNodeNodeId(exitNodeId);
  if (!nodes.some((n) => n.id === nodeId)) {
    nodes.push({
      id: nodeId,
      type: "exitNodeNode",
      data: buildExitNodeNodeData(exitNodeId, exitNodes, peers),
      position: { x: 0, y: 0 },
    });
  }
  const edgeId = `policy-dest-exit-node-${policy.id}-${nodeId}`;
  if (!edges.some((e) => e.id === edgeId)) {
    edges.push({
      id: edgeId,
      source: `policy-${policy.id}`,
      target: nodeId,
      type: "smart",
      data: { enabled: policy.enabled, policy },
    });
  }
}

export function addDestinationResourceNodes(
  policy: Policy,
  nodes: Node[],
  edges: Edge[],
  // A failed /peers request resolves to undefined; the view degrades to
  // resource lookups instead of crashing.
  peers: Peer[] | undefined,
  networkResources: NetworkResource[],
  networks?: Network[],
  exitNodes?: ExitNode[],
) {
  const destinationPolicyResource = policy?.rules?.[0].destinationResource;
  const enabled = policy.enabled;

  if (!destinationPolicyResource) return;

  if (destinationPolicyResource.type === "exit_node") {
    addExitNodeDestination(
      policy,
      destinationPolicyResource.id,
      nodes,
      edges,
      peers,
      exitNodes,
    );
    return;
  }

  const type = destinationPolicyResource.type;
  const peer = peers?.find((p) => p.id === destinationPolicyResource.id);
  const resource = networkResources.find(
    (r) => r.id === destinationPolicyResource.id,
  );
  const nodeId = `destination-resource-${destinationPolicyResource.id}`;
  const nodeExists = nodes.some((n) => n.id === nodeId);

  if (!nodeExists) {
    if (type === "peer" && peer) {
      nodes.push({
        id: nodeId,
        type: "destinationResourceNode",
        data: { peer, enabled, standalone: true },
        position: { x: 0, y: 0 },
      });
    } else if (resource) {
      // Without the network ref the card shows no network at all.
      const net = networks?.find((n) => n.resources?.includes(resource.id));
      nodes.push({
        id: nodeId,
        type: "destinationResourceNode",
        // standalone selects the card look, not the transparent DeviceCard.
        data: {
          resource,
          enabled,
          standalone: true,
          ...(net?.id
            ? { draftNetwork: { networkId: net.id, name: net.name } }
            : {}),
        },
        position: { x: 0, y: 0 },
      });
    }
  } else {
    nodes.forEach((n) => {
      if (n.id === nodeId) {
        n.data = { ...n.data, enabled };
      }
    });
  }

  const edgeExists = edges.some(
    (e) => e.id === `policy-dest-resource-${policy.id}-${nodeId}`,
  );
  if (!edgeExists) {
    edges.push({
      id: `policy-dest-resource-${policy.id}-${nodeId}`,
      source: `policy-${policy.id}`,
      target: nodeId,
      type: "smart",
      data: { enabled, policy },
    });
  }
}

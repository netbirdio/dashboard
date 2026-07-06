import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Edge, Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";

export interface ViewDataDeps {
  policies: Policy[];
  peers: Peer[];
  networks: any[];
  networkResources: NetworkResource[];
  groups: Group[];
  selectedDestinationGroup: string;
}

export interface ViewResult {
  updatedNodes: Node[];
  updatedEdges: Edge[];
}

export function addDestinationResourceNodes(
  policy: Policy,
  nodes: Node[],
  edges: Edge[],
  peers: Peer[],
  networkResources: NetworkResource[],
) {
  const destinationPolicyResource = policy?.rules?.[0].destinationResource;
  const enabled = policy.enabled;

  if (!destinationPolicyResource) return;

  const type = destinationPolicyResource.type;
  const peer = peers.find((p) => p.id === destinationPolicyResource.id);
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
        data: { peer, enabled, className: "pl-3" },
        position: { x: 0, y: 0 },
      });
    } else if (resource) {
      nodes.push({
        id: nodeId,
        type: "destinationResourceNode",
        data: { resource, enabled, className: "pl-3" },
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
      type: "in",
      data: { enabled, type: "bezier" },
    });
  }
}

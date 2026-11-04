import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Edge, Node } from "@xyflow/react";

export interface ViewResult {
  updatedNodes: Node[];
  updatedEdges: Edge[];
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
) {
  const destinationPolicyResource = policy?.rules?.[0].destinationResource;
  const enabled = policy.enabled;

  if (!destinationPolicyResource) return;

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

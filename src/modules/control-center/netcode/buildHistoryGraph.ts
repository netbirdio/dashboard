import { Edge, Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import {
  NetCodeAccountSpec,
  NetCodeGroup,
  NetCodePolicy,
} from "@/interfaces/NetCode";
// Node type strings rather than the NodeType enum: utils/nodes pulls in every
// node component (and with it the app config), which a unit test cannot load.
import {
  addEdge,
  addNode,
} from "@/modules/control-center/utils/graph-builder";
import { applyDraftBuildLayout } from "@/modules/control-center/utils/draft-build-layout";

// Renders a historical account configuration (a netcode commit snapshot) on the
// canvas: sources -> policies -> destinations, mirroring the draft build so a
// past state looks like the live one. Read-only — nothing here is editable, so
// connect handles stay off and every node carries an explicit `enabled` (a
// missing one would be inferred from incoming edges and render dimmed).

const toLivePeer = (peer: {
  id: string;
  name: string;
  ip?: string;
  location?: { countryCode?: string } | null;
}): Peer =>
  ({
    id: peer.id,
    name: peer.name,
    ip: peer.ip ?? "",
    country_code: peer.location?.countryCode,
  }) as unknown as Peer;

const toLiveGroup = (group: NetCodeGroup): Group =>
  ({
    id: group.id,
    name: group.name,
    issued: group.issued,
    peers_count: group.peers?.length ?? 0,
    resources_count: group.resources?.length ?? 0,
  }) as unknown as Group;

const toLivePolicy = (policy: NetCodePolicy): Policy => {
  const rule = policy.rules?.[0];
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? "",
    enabled: policy.enabled,
    source_posture_checks: policy.sourcePostureChecks ?? [],
    rules: [
      {
        id: rule?.id ?? `${policy.id}-rule`,
        name: rule?.name || policy.name,
        description: rule?.description ?? "",
        enabled: rule?.enabled ?? policy.enabled,
        // PolicyNode's label helper dereferences the protocol, so it must
        // never be empty
        protocol: (rule?.protocol || "all") as Policy["rules"][0]["protocol"],
        action: rule?.action ?? "accept",
        bidirectional: rule?.bidirectional ?? false,
        ports: rule?.ports ?? [],
        sources: null,
        destinations: null,
      },
    ],
  } as unknown as Policy;
};

export function buildHistoryGraph(spec: NetCodeAccountSpec): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const groupsById = new Map(
    (spec.groups ?? []).map((group) => [group.id, group]),
  );
  const peersById = new Map((spec.peers ?? []).map((peer) => [peer.id, peer]));
  const resourcesById = new Map(
    (spec.networkResources ?? []).map((resource) => [resource.id, resource]),
  );
  const networksById = new Map(
    (spec.networks ?? []).map((network) => [network.id, network]),
  );

  const policies = [...(spec.policies ?? [])].sort(
    (a, b) => Number(b.enabled) - Number(a.enabled),
  );

  for (const policy of policies) {
    const rule = policy.rules?.[0];
    if (!rule) continue;

    const enabled = policy.enabled;
    const livePolicy = toLivePolicy(policy);
    const policyNodeId = `policy-${policy.id}`;

    addNode(nodes, {
      id: policyNodeId,
      type: "policyNode",
      data: { policy: livePolicy, enabled },
      position: { x: 0, y: 0 },
    });

    const sourceGroupIds = new Set(rule.sources ?? []);
    const destinationGroupIds = new Set(rule.destinations ?? []);

    // Source groups
    for (const groupId of rule.sources ?? []) {
      const group = groupsById.get(groupId);
      if (!group) continue;
      const nodeId = `group-${groupId}`;
      addNode(nodes, {
        id: nodeId,
        type: "groupNode",
        data: {
          group: toLiveGroup(group),
          enabled,
          showHandles: false,
          hoverable: false,
        },
        position: { x: 0, y: 0 },
      });
      addEdge(edges, {
        id: `${nodeId}-${policyNodeId}`,
        source: nodeId,
        target: policyNodeId,
        type: "smart",
        data: { enabled, policy: livePolicy },
      });
    }

    // Source peer
    if (rule.sourceResource?.type === "peer") {
      const peer = peersById.get(rule.sourceResource.address);
      if (peer) {
        const nodeId = `peer-${peer.id}`;
        addNode(nodes, {
          id: nodeId,
          type: "peerNode",
          data: {
            peer: toLivePeer(peer),
            enabled: true,
            showHandles: false,
            variant: "card",
          },
          position: { x: 0, y: 0 },
        });
        addEdge(edges, {
          id: `${nodeId}-${policyNodeId}`,
          source: nodeId,
          target: policyNodeId,
          type: "smart",
          data: { enabled, policy: livePolicy },
        });
      }
    }

    // Destination groups — a group on both sides gets its own destination copy
    for (const groupId of rule.destinations ?? []) {
      const group = groupsById.get(groupId);
      if (!group) continue;
      const isSelfReference =
        sourceGroupIds.has(groupId) && destinationGroupIds.has(groupId);
      const nodeId = isSelfReference
        ? `dest-group-${groupId}-${policy.id}`
        : `group-${groupId}`;
      addNode(nodes, {
        id: nodeId,
        type: "destinationGroupNode",
        data: {
          group: toLiveGroup(group),
          enabled,
          showHandles: false,
          hoverable: false,
        },
        position: { x: 0, y: 0 },
      });
      addEdge(edges, {
        id: `${policyNodeId}-${nodeId}`,
        source: policyNodeId,
        target: nodeId,
        type: "smart",
        data: { enabled, policy: livePolicy },
      });
    }

    // Destination resource or peer
    const destination = rule.destinationResource;
    if (destination?.address) {
      if (destination.type === "peer") {
        const peer = peersById.get(destination.address);
        if (peer) {
          const nodeId = `peer-${peer.id}`;
          addNode(nodes, {
            id: nodeId,
            type: "peerNode",
            data: {
              peer: toLivePeer(peer),
              enabled: true,
              showHandles: false,
              variant: "card",
            },
            position: { x: 0, y: 0 },
          });
          addEdge(edges, {
            id: `${policyNodeId}-${nodeId}`,
            source: policyNodeId,
            target: nodeId,
            type: "smart",
            data: { enabled, policy: livePolicy },
          });
        }
      } else {
        const resource = resourcesById.get(destination.address);
        if (resource) {
          const nodeId = `resource-${resource.id}`;
          const network = resource.networkId
            ? networksById.get(resource.networkId)
            : undefined;
          addNode(nodes, {
            id: nodeId,
            type: "resourceNode",
            data: {
              resource: {
                id: resource.id,
                name: resource.name,
                address: resource.address,
                type: resource.type,
                enabled: resource.enabled,
              } as unknown as NetworkResource,
              enabled: resource.enabled,
              showHandles: false,
              standalone: true,
              ...(network
                ? { draftNetwork: { networkId: network.id, name: network.name } }
                : {}),
            },
            position: { x: 0, y: 0 },
          });
          addEdge(edges, {
            id: `${policyNodeId}-${nodeId}`,
            source: policyNodeId,
            target: nodeId,
            type: "smart",
            data: { enabled, policy: livePolicy },
          });
        }
      }
    }
  }

  const { updatedNodes, updatedEdges } = applyDraftBuildLayout(nodes, edges);
  return { nodes: updatedNodes, edges: updatedEdges };
}

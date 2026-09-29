import { Edge, Node } from "@xyflow/react";
import { useMemo } from "react";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import type {
  AgentPolicy,
  AIProvider,
} from "@/modules/agent-network/data/mockData";
import { addEdge, addNode } from "@/modules/control-center/utils/graph-builder";
import { NodeType } from "@/modules/control-center/utils/nodes";

export interface AgentNetworkOverlay {
  policies: AgentPolicy[];
  providerById: Map<string, AIProvider>;
}

// AIProvidersProvider owns these fetches and gates them on the feature flag, so
// the views read from it rather than hitting the endpoints again.
export function useAgentNetworkOverlay(): AgentNetworkOverlay {
  const { providers, policies } = useAIProviders();
  const providerById = useMemo(() => {
    const byId = new Map<string, AIProvider>();
    providers.forEach((p) => byId.set(p.id, p));
    return byId;
  }, [providers]);
  return useMemo(() => ({ policies, providerById }), [policies, providerById]);
}

// Appends `sourceNodeId → agent-policy-<id> → provider-<id>`, mirroring the
// access-control shape. Ids are stable, so nodes reached twice are added once.
export function addAgentNetworkProviderNodes(
  groupId: string,
  sourceNodeId: string,
  nodes: Node[],
  edges: Edge[],
  { policies, providerById }: AgentNetworkOverlay,
  sourceHandle?: string,
) {
  if (!groupId || policies.length === 0) return;

  policies
    .filter((policy) => policy.sourceGroups.includes(groupId))
    .forEach((policy) => {
      if (policy.destinationProviderIds.length === 0) return;

      const enabled = policy.enabled !== false;
      const policyNodeId = `agent-policy-${policy.id}`;

      addNode(nodes, {
        id: policyNodeId,
        type: NodeType.AgentPolicyNode,
        data: { id: policy.id, name: policy.name, enabled },
        position: { x: 0, y: 0 },
      });

      // Keyed by source and policy, deliberately not by group: a source can
      // reach one policy through several of its groups, and that is still a
      // single edge. The source itself has to be in the id because draft draws
      // one edge per group NODE, which are genuinely separate edges.
      addEdge(edges, {
        id: `agent-src-${sourceNodeId}-${policy.id}`,
        source: sourceNodeId,
        sourceHandle,
        target: policyNodeId,
        type: "smart",
        data: { enabled },
      });

      policy.destinationProviderIds.forEach((providerId) => {
        const provider = providerById.get(providerId);
        if (!provider) return;

        const providerEnabled = provider.status !== "disabled";
        const providerNodeId = `provider-${providerId}`;
        addNode(nodes, {
          id: providerNodeId,
          type: NodeType.ProviderNode,
          data: {
            id: provider.id,
            providerId: provider.providerId,
            name: provider.name,
            upstreamUrl: provider.upstreamUrl,
            enabled: providerEnabled,
          },
          position: { x: 0, y: 0 },
        });

        addEdge(edges, {
          id: `agent-dst-${policy.id}-${providerId}`,
          source: policyNodeId,
          target: providerNodeId,
          type: "smart",
          data: { enabled: enabled && providerEnabled },
        });
      });
    });
}

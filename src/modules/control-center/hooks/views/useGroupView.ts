import { Edge, Node } from "@xyflow/react";
import { orderBy, sortBy } from "lodash";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import {
  addAgentNetworkProviderNodes,
  useAgentNetworkOverlay,
} from "./agent-network-overlay";
import { addDestinationResourceNodes, ViewResult } from "./types";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { withFreshGroupCounts } from "@/modules/control-center/utils/helpers";

export function useGroupView() {
  const { policies, peers, networks, networkResources, groups, isDataReady } =
    useControlCenterData();
  const agentNetwork = useAgentNetworkOverlay();

  // policiesOverride rebuilds from data fresher than the SWR cache.
  const applySingleGroupView = (
    groupId: string,
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const groupPolicies = sortBy(
      (policiesOverride ?? policies!).filter((policy) => {
        const rule = policy.rules?.[0];
        if (!rule) return false;
        const sources = rule.sources as Group[];
        const destinations = rule.destinations as Group[];
        return (
          sources?.some((s) => s.id === groupId) ||
          destinations?.some((d) => d.id === groupId)
        );
      }),
      // Ascending — disabled first (live/draft parity; see usePeerView).
      "enabled",
    );

    groupPolicies.forEach((policy) => {
      const rule = policy.rules?.[0];
      const enabled = rule?.enabled;
      const isSource = (rule?.sources as Group[])?.some(
        (s) => s.id === groupId,
      );

      // side "left" mirrors the policy column when the group is only a
      // destination.
      addNode(allNodes, {
        id: `policy-${policy.id}`,
        type: "policyNode",
        data: { policy, side: isSource ? "right" : "left" },
        position: { x: 0, y: 0 },
      });

      if (!isSource) {
        addEdge(allEdges, {
          id: `policy-group-${policy.id}-${groupId}`,
          source: `policy-${policy.id}`,
          target: `select-group-node`,
          type: "smart",
          data: { enabled, policy },
        });

        const sources = orderBy(rule?.sources as Group[], "name", "asc");
        sources?.forEach((source) => {
          addNode(allNodes, {
            id: `source-group-${source.id}`,
            type: "sourceGroupNode",
            // Explicit: GroupNode's fallback checks incoming edges, which
            // source groups don't have.
            data: { group: withFreshGroupCounts(source, groups), enabled },
            position: { x: 0, y: 0 },
          });

          addEdge(allEdges, {
            id: `group-policy-${source.id}-${policy.id}`,
            source: `source-group-${source.id}`,
            target: `policy-${policy.id}`,
            type: "smart",
            data: { enabled, policy },
          });
        });
        return;
      }

      addEdge(allEdges, {
        id: `group-policy-${groupId}-${policy.id}`,
        source: `select-group-node`,
        target: `policy-${policy.id}`,
        type: "smart",
        data: { enabled, policy },
      });

      const destinations = orderBy(
        policy.rules?.[0].destinations as Group[],
        "name",
        "asc",
      );
      destinations?.forEach((destination) => {
        const destinationNodeId = `group-${destination.id}`;
        const destinationNodeExists = allNodes.some(
          (n) => n.id === destinationNodeId,
        );
        if (!destinationNodeExists) {
          allNodes.push({
            id: destinationNodeId,
            type: "destinationGroupNode",
            data: { group: withFreshGroupCounts(destination, groups) },
            position: { x: 0, y: 0 },
          });

        } else {
          allNodes.forEach((n) => {
            if (n.id === destinationNodeId) {
              n.data = { ...n.data, enabled };
            }
          });
        }

        addEdge(allEdges, {
          id: `policy-group-${policy.id}-${destination.id}`,
          source: `policy-${policy.id}`,
          target: destinationNodeId,
          type: "smart",
          data: { enabled, policy },
        });
      });

      addDestinationResourceNodes(
        policy,
        allNodes,
        allEdges,
        peers!,
        networkResources!,
        networks,
      );
    });

    addAgentNetworkProviderNodes(
      groupId,
      `select-group-node`,
      allNodes,
      allEdges,
      agentNetwork,
    );

    return applyD3HierarchicalLayout(
      allNodes,
      allEdges,
      400,
      120,
      "group",
      DEFAULT_LAYOUT_CONFIG,
    );
  };

  return { applySingleGroupView };
}

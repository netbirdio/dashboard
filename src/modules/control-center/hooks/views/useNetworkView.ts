import { Edge, Node } from "@xyflow/react";
import { forEach } from "lodash";
import { Group } from "@/interfaces/Group";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";
import {
  applyD3HierarchicalLayout,
  applyD3ForceLayout,
} from "@/modules/control-center/utils/layouts";
import {
  getResourcePolicyByGroups,
  getPolicyProtocolAndPortText,
} from "@/modules/control-center/utils/helpers";
import { ViewResult } from "./types";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function useNetworkView() {
  const { selectedNetwork, layoutInitialized, forceSingleGroupViewRef } =
    useCanvasState();
  const { policies, networks, networkResources, isLoading, isDataReady } =
    useControlCenterData();

  const applySingleNetworkView = (
    networkId: string,
  ): ViewResult | undefined => {
    if (isLoading) return;
    if (layoutInitialized) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const network = networks?.find((n) => n.id === networkId);
    if (!network) return;

    const networkPolicies = network.policies || [];

    forEach(networkPolicies, (p) => {
      const policy = policies?.find((policyItem) => policyItem.id === p);
      if (!policy) return;
      const enabled = policy.rules?.[0]?.enabled;

      addNode(allNodes, {
        id: `policy-${policy.id}`,
        type: "policyNode",
        data: { policy, enabled },
        position: { x: 0, y: 0 },
      });

      const rule = policy.rules?.[0];
      if (rule) {
        const ruleSourceGroups = (rule.sources as Group[]) || [];

        ruleSourceGroups.forEach((group) => {
          addNode(allNodes, {
            id: `group-${group.id}`,
            type: "groupNode",
            data: {
              group,
              enabled,
              onClick: () => forceSingleGroupViewRef.current(group.id || ""),
            },
            position: { x: 0, y: 0 },
          });

          addEdge(allEdges, {
            id: `group-${group.id}-policy-${policy.id}`,
            source: `group-${group.id}`,
            target: `policy-${policy.id}`,
            type: "in",
            data: { enabled, type: "bezier" },
          });
        });
      }
    });

    const resources = network.resources || [];

    resources.forEach((r) => {
      const resource = networkResources?.find((n) => n.id === r);
      if (!resource) return;

      addNode(allNodes, {
        id: `resource-${resource.id}`,
        type: "resourceNode",
        data: { resource },
        position: { x: 0, y: 0 },
      });

      const networkResourceGroups = (resource.groups as Group[]) || [];

      let resourcePolicies = getResourcePolicyByGroups(
        networkResourceGroups as Group[],
        policies ?? [],
      );

      resourcePolicies = resourcePolicies.filter((rp) =>
        networkPolicies.includes(rp.id || ""),
      );

      resourcePolicies.forEach((policy) => {
        const rule = policy.rules?.[0];
        const enabled = policy.enabled;
        if (rule) {
          const ruleSourceGroups = (rule.sources as Group[]) || [];
          const ruleDestinationGroups = (rule.destinations as Group[]) || [];

          ruleDestinationGroups.forEach((group) => {
            const resourceGroup = networkResourceGroups.find(
              (g) => g.id === group.id,
            );
            if (!resourceGroup) return;

            addNode(allNodes, {
              id: `group-${group.id}`,
              type: "destinationGroupNode",
              data: { group, enabled, hoverable: false },
              position: { x: 0, y: 0 },
            });

            addEdge(allEdges, {
              id: `policy-${policy.id}-group-${group.id}`,
              source: `policy-${policy.id}`,
              target: `group-${group.id}`,
              type: "in",
              data: { enabled, type: "bezier" },
            });

            addEdge(allEdges, {
              id: `group-${group.id}-resource-${resource.id}`,
              source: `group-${group.id}`,
              target: `resource-${resource.id}`,
              type: "simple",
            });
          });

          ruleSourceGroups.forEach((group) => {
            addNode(allNodes, {
              id: `group-${group.id}`,
              type: "groupNode",
              data: { group, enabled },
              position: { x: 0, y: 0 },
            });

            addEdge(allEdges, {
              id: `group-${group.id}-policy-${policy.id}`,
              source: `group-${group.id}`,
              target: `policy-${policy.id}`,
              type: "in",
              data: { enabled, type: "bezier" },
            });
          });
        }
      });
    });

    return applyD3HierarchicalLayout(
      allNodes,
      allEdges,
      400,
      120,
      "network",
      DEFAULT_LAYOUT_CONFIG,
    );
  };

  const applyNetworksView = (): ViewResult | undefined => {
    if (!isDataReady()) return;
    if (layoutInitialized) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const hidePolicies = !selectedNetwork;

    networks!.forEach((network) => {
      allNodes.push({
        id: `network-${network.id}`,
        type: "networkNode",
        data: { network, selectedNetwork },
        draggable: true,
        position: { x: 0, y: 0 },
      });

      const networkPolicies = network.policies || [];
      if (networkPolicies.length > 0) {
        forEach(networkPolicies, (p) => {
          const policy = policies!.find((policyItem) => policyItem.id === p);
          if (policy) {
            const enabled = policy.rules?.[0]?.enabled;
            const rule = policy.rules?.[0];
            if (rule) {
              const ruleSourceGroups = (rule.sources as Group[]) || [];

              ruleSourceGroups.forEach((group) => {
                addNode(allNodes, {
                  id: `group-${group.id}`,
                  type: "groupNode",
                  data: {
                    group,
                    enabled,
                    onClick: () =>
                      forceSingleGroupViewRef.current(group.id || ""),
                  },
                  position: { x: 0, y: 0 },
                });

                if (hidePolicies) {
                  const label = getPolicyProtocolAndPortText(policy);
                  addEdge(allEdges, {
                    id: `group-${group.id}-network-${network.id}`,
                    source: `group-${group.id}`,
                    target: `network-${network.id}`,
                    type: "floating-straight",
                    data: { label },
                  });
                }
              });
            }
          }
        });
      }
    });

    return applyD3ForceLayout(allNodes, allEdges);
  };

  return { applySingleNetworkView, applyNetworksView };
}

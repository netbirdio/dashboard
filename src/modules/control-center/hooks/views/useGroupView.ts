import { Edge, Node } from "@xyflow/react";
import { orderBy, sortBy } from "lodash";
import { Group } from "@/interfaces/Group";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { addDestinationResourceNodes, ViewResult } from "./types";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function useGroupView() {
  const { policies, peers, networkResources, isDataReady } =
    useControlCenterData();

  const applySingleGroupView = (groupId: string): ViewResult | undefined => {
    if (!isDataReady()) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const groupPolicies = sortBy(
      policies!.filter((policy) => {
        const rule = policy.rules?.[0];
        if (!rule) return false;
        const sources = rule.sources as Group[];
        return sources?.some((d) => d.id === groupId);
      }),
      "enabled",
      "asc",
    );

    groupPolicies.forEach((policy) => {
      const enabled = policy.rules?.[0]?.enabled;
      addNode(allNodes, {
        id: `policy-${policy.id}`,
        type: "policyNode",
        data: { policy },
        position: { x: 0, y: 0 },
      });

      addEdge(allEdges, {
        id: `group-policy-${groupId}-${policy.id}`,
        source: `select-group-node`,
        target: `policy-${policy.id}`,
        type: "in",
        data: { enabled, type: "bezier" },
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
            data: { group: destination },
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
          type: "in",
          data: { enabled, type: "bezier" },
        });
      });

      addDestinationResourceNodes(
        policy,
        allNodes,
        allEdges,
        peers!,
        networkResources!,
      );
    });

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

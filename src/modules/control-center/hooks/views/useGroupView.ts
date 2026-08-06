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
import { addDestinationResourceNodes, ViewResult } from "./types";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function useGroupView() {
  const { policies, peers, networks, networkResources, isDataReady } =
    useControlCenterData();

  // policiesOverride: rebuild from fresher data than the SWR cache (e.g. the
  // PUT response of a policy update) — see refreshLiveView.
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

      // side: "left" mirrors the policy column to the left of the selected
      // group when the group is only a destination (sources → policy → group).
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
            // Explicit enabled — GroupNode's fallback checks INCOMING edges,
            // and source groups only have outgoing ones (they'd render dimmed).
            data: { group: source, enabled },
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

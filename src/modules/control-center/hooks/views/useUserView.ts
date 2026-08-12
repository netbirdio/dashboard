import { Edge, Node } from "@xyflow/react";
import { sortBy } from "lodash";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { DEFAULT_LAYOUT_CONFIG } from "@/modules/control-center/utils/graph-builder";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { addDestinationResourceNodes, ViewResult } from "./types";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { withFreshGroupCounts } from "@/modules/control-center/utils/helpers";

export function useUserView() {
  const { policies, peers, networks, networkResources, groups, isDataReady } =
    useControlCenterData();

  const applyUserView = (
    userId: string,
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const userPeers = peers?.filter((p) => p.user_id === userId) || [];
    if (userPeers.length === 0) {
      return applyD3HierarchicalLayout(
        [],
        [],
        400,
        120,
        "user",
        DEFAULT_LAYOUT_CONFIG,
      );
    }

    userPeers.forEach((peer) => {
      allNodes.push({
        id: `source-peer-${peer.id}`,
        type: "sourcePeerNode",
        data: {
          peer,
          enabled: true,
          // Draft-style card look (bg + border), read-only: no connect
          // handles in live mode.
          variant: "card",
          showHandles: false,
          // No click action — highlighting goes through the header's
          // Focus tool (armed clicks land in onNodeClick).
        },
        position: { x: 0, y: 0 },
      });

      allEdges.push({
        id: `user-peer-${userId}-${peer.id}`,
        source: `select-user-node`,
        target: `source-peer-${peer.id}`,
        type: "simple",
        data: { enabled: true },
      });
    });

    const allUserGroups = [
      ...new Set(userPeers.flatMap((p) => p.groups?.map((g) => g.id) || [])),
    ];
    const userPolicies = sortBy(
      (policiesOverride ?? policies!).filter((p) => {
        const rule = p.rules?.[0];
        if (!rule) return false;
        const sources = rule.sources as Group[];
        return sources?.some((d) => allUserGroups.includes(d.id));
      }),
      // Ascending — disabled first (live/draft parity; see usePeerView).
      "enabled",
    );

    userPolicies?.forEach((policy, policyIndex) => {
      const enabled = policy.enabled;
      const policyNodeId = `policy-${policy.id}`;

      allNodes.push({
        id: policyNodeId,
        type: "policyNode",
        data: { policy },
        position: { x: 600, y: policyIndex * 120 },
      });

      const rule = policy.rules?.[0];
      const sourcesIds = (rule?.sources as Group[])?.map((g) => g.id) || [];

      userPeers.forEach((peer) => {
        const peerGroupIds = peer.groups?.map((g) => g.id) || [];
        const hasSharedGroup = sourcesIds.some((sourceId) =>
          peerGroupIds.includes(sourceId),
        );

        if (hasSharedGroup) {
          allEdges.push({
            id: `peer-policy-${peer.id}-${policy.id}`,
            source: `source-peer-${peer.id}`,
            sourceHandle: "sr",
            target: policyNodeId,
            type: "smart",
            data: { enabled, policy },
          });
        }
      });

      const destinations = (rule?.destinations as Group[]) || [];
      destinations.forEach((destination, destIndex) => {
        const destinationNodeId = `group-${destination.id}`;
        const destinationNodeExists = allNodes.some(
          (n) => n.id === destinationNodeId,
        );

        if (!destinationNodeExists) {
          allNodes.push({
            id: destinationNodeId,
            type: "destinationGroupNode",
            data: { group: withFreshGroupCounts(destination, groups) },
            position: { x: 900, y: policyIndex * 120 + destIndex * 60 },
          });
        }

        const destinationEdgeExists = allEdges.some(
          (e) => e.id === `policy-group-${policy.id}-${destination.id}`,
        );
        if (!destinationEdgeExists) {
          allEdges.push({
            id: `policy-group-${policy.id}-${destination.id}`,
            source: policyNodeId,
            target: destinationNodeId,
            type: "smart",
            data: { enabled, policy },
          });
        }

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
      "user",
      DEFAULT_LAYOUT_CONFIG,
    );
  };

  return { applyUserView };
}

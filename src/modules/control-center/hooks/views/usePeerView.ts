import { Edge, Node } from "@xyflow/react";
import { sortBy } from "lodash";
import { Group } from "@/interfaces/Group";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";
import { applyD3HierarchicalLayout } from "@/modules/control-center/utils/layouts";
import { addDestinationResourceNodes, ViewResult } from "./types";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function usePeerView() {
  const { policies, peers, networkResources, isDataReady } =
    useControlCenterData();

  const applyPeerView = (peerId: string): ViewResult | undefined => {
    if (!isDataReady()) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const peer = peers?.find((p) => p.id === peerId);
    if (!peer) return;

    const peerGroups = peer.groups || [];

    const peerPolicies = sortBy(
      policies!.filter((p) => {
        const rule = p.rules?.[0];
        if (!rule) return false;
        const sources = rule.sources as Group[];
        return sources?.some((d) => peerGroups?.some((pg) => pg.id === d.id));
      }),
      "enabled",
      "desc",
    );

    peerPolicies?.forEach((policy) => {
      const enabled = policy.enabled;
      addNode(allNodes, {
        id: `policy-${policy.id}`,
        type: "policyNode",
        data: { policy },
        position: { x: 0, y: 0 },
      });

      addEdge(allEdges, {
        id: `peer-policy-${peer.id}-${policy.id}`,
        source: `select-peer-node`,
        target: `policy-${policy.id}`,
        type: "smart",
        data: { enabled, policy },
      });

      const destinations = policy.rules?.[0].destinations as Group[];
      destinations?.forEach((destination) => {
        const destinationNodeId = `group-${destination.id}`;
        addNode(allNodes, {
          id: destinationNodeId,
          type: "destinationGroupNode",
          data: { group: destination, enabled },
          position: { x: 0, y: 0 },
        });

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
      );
    });

    return applyD3HierarchicalLayout(
      allNodes,
      allEdges,
      400,
      120,
      "peer",
      DEFAULT_LAYOUT_CONFIG,
    );
  };

  return { applyPeerView };
}

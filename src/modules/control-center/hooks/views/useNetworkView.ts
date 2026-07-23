import { Edge, Node } from "@xyflow/react";
import { forEach } from "lodash";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  addNode,
  addEdge,
} from "@/modules/control-center/utils/graph-builder";
import { applyD3ForceLayout } from "@/modules/control-center/utils/layouts";
import { applyDrilledLayout } from "@/modules/control-center/utils/drilled-layout";
import {
  getFrameChildPosition,
  getNetworkFrameHeight,
  getResourcePolicyByGroups,
  getPolicyProtocolAndPortText,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_WIDTH,
} from "@/modules/control-center/utils/helpers";
import { ViewResult } from "./types";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

// Uni-directional (network access is always one-way) — SmartEdge's blue.
const NETWORK_LINE_COLOR = "#0ea5e9";

export function useNetworkView() {
  const { selectedNetwork, layoutInitialized, forceSingleGroupViewRef } =
    useCanvasState();
  const { policies, networks, networkResources, peers, isLoading, isDataReady } =
    useControlCenterData();

  // policiesOverride: rebuild from fresher data than the SWR cache (e.g. the
  // PUT response of a policy update) — see refreshLiveView. Refreshes happen
  // on an already-initialized layout, so the guard is skipped.
  const applySingleNetworkView = (
    networkId: string,
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (isLoading) return;
    if (layoutInitialized && !policiesOverride) return;
    const effectivePolicies = policiesOverride ?? policies;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const network = networks?.find((n) => n.id === networkId);
    if (!network) return;

    const networkPolicies = network.policies || [];

    forEach(networkPolicies, (p) => {
      const policy = effectivePolicies?.find(
        (policyItem) => policyItem.id === p,
      );
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
            type: "smart",
            data: { enabled, policy },
          });
        });

        // Single-peer sources (rule.sourceResource) connect to the policy
        // like a source group would.
        const sourceResource = rule.sourceResource;
        if (sourceResource?.id && sourceResource.type === "peer") {
          const peer = peers?.find((p) => p.id === sourceResource.id);
          if (peer) {
            addNode(allNodes, {
              id: `peer-${peer.id}`,
              type: "peerNode",
              // Live view: card look, no connect handles (read-only).
              data: { peer, enabled: true, variant: "card", showHandles: false },
              position: { x: 0, y: 0 },
            });

            addEdge(allEdges, {
              id: `peer-${peer.id}-policy-${policy.id}`,
              source: `peer-${peer.id}`,
              target: `policy-${policy.id}`,
              type: "smart",
              data: { enabled, policy },
            });
          }
        }
      }
    });

    const resources = network.resources || [];

    resources.forEach((r) => {
      const resource = networkResources?.find((n) => n.id === r);
      if (!resource) return;

      addNode(allNodes, {
        id: `resource-${resource.id}`,
        type: "resourceNode",
        // The draftNetwork ref routes the node to the standalone CARD look
        // (name - network inline), same as the draft drill-down.
        data: {
          resource,
          enabled: true,
          draftNetwork: { networkId: network.id, name: network.name },
        },
        position: { x: 0, y: 0 },
      });

      // Policies targeting this resource DIRECTLY (single-resource
      // destination) — the group sweep below only covers group-mediated ones.
      (effectivePolicies ?? []).forEach((policy) => {
        if (!networkPolicies.includes(policy.id || "")) return;
        if (policy.rules?.[0]?.destinationResource?.id !== resource.id) return;
        addEdge(allEdges, {
          id: `policy-${policy.id}-resource-${resource.id}`,
          source: `policy-${policy.id}`,
          target: `resource-${resource.id}`,
          type: "smart",
          data: { enabled: policy.enabled, policy },
        });
      });

      const networkResourceGroups = (resource.groups as Group[]) || [];

      let resourcePolicies = getResourcePolicyByGroups(
        networkResourceGroups as Group[],
        effectivePolicies ?? [],
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
              type: "smart",
              data: { enabled, policy },
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
              type: "smart",
              data: { enabled, policy },
            });
          });
        }
      });
    });

    // THE shared single-network layout (see drilled-layout.ts) — identical
    // to the draft drill-down's arrangement.
    return applyDrilledLayout(allNodes, allEdges);
  };

  const applyNetworksView = (
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;
    if (layoutInitialized && !policiesOverride) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    // Frame children (resources) are appended AFTER the layout — the force
    // layout must not touch their frame-relative positions, and ReactFlow
    // needs parents to precede children in the array.
    const childNodes: Node[] = [];
    const hidePolicies = !selectedNetwork;

    networks!.forEach((network) => {
      // Live networks render as FRAMES too (same chrome as draft frames,
      // read-only): resources live inside as children, the floating
      // RoutingPeersBar shows the routers, clicking drills into the
      // single-network view.
      const childResources = (network.resources ?? [])
        .map((rid) => networkResources?.find((r) => r.id === rid))
        .filter(Boolean) as NonNullable<typeof networkResources>;

      allNodes.push({
        id: `network-${network.id}`,
        type: "networkNode",
        data: { network, selectedNetwork, frame: true },
        draggable: true,
        position: { x: 0, y: 0 },
        style: {
          width: NETWORK_FRAME_WIDTH,
          height: getNetworkFrameHeight(Math.max(childResources.length, 1)),
        },
      });
      childResources.forEach((resource, i) => {
        childNodes.push({
          id: `resource-${resource.id}`,
          type: "resourceNode",
          parentId: `network-${network.id}`,
          position: getFrameChildPosition(i),
          // Draft row-drags move the whole frame (useDragToGroup intercepts);
          // live has no such interception, so rows aren't draggable at all.
          draggable: false,
          style: { width: NETWORK_FRAME_CHILD_WIDTH },
          data: {
            resource,
            enabled: true,
            draftNetwork: { networkId: network.id, name: network.name },
          },
        });
      });

      const networkPolicies = network.policies || [];
      if (networkPolicies.length > 0) {
        forEach(networkPolicies, (p) => {
          const policy = (policiesOverride ?? policies!).find(
            (policyItem) => policyItem.id === p,
          );
          if (policy) {
            const enabled = policy.rules?.[0]?.enabled;
            const rule = policy.rules?.[0];
            if (rule) {
              const ruleSourceGroups = (rule.sources as Group[]) || [];
              const sourceResource = rule.sourceResource;
              const sourcePeer =
                sourceResource?.id && sourceResource.type === "peer"
                  ? peers?.find((pr) => pr.id === sourceResource.id)
                  : undefined;
              const sourceIds: string[] = [];

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
                sourceIds.push(`group-${group.id}`);
              });

              // A single-peer source (rule.sourceResource) connects like a
              // source group.
              if (sourcePeer) {
                addNode(allNodes, {
                  id: `peer-${sourcePeer.id}`,
                  type: "peerNode",
                  // Live view: card look, no connect handles (read-only).
                  data: {
                    peer: sourcePeer,
                    enabled: true,
                    variant: "card",
                    showHandles: false,
                  },
                  position: { x: 0, y: 0 },
                });
                sourceIds.push(`peer-${sourcePeer.id}`);
              }

              // Straight blue dashed lines source → network with the
              // policy's protocol/port label — network access is always
              // one-way (blue, never the bidirectional green).
              if (hidePolicies && sourceIds.length > 0) {
                // "All" fallback like the policy pill — an all-traffic policy
                // has no protocol/port text and would leave the line bare.
                const label = getPolicyProtocolAndPortText(policy) || "All";
                sourceIds.forEach((sourceId) => {
                  addEdge(allEdges, {
                    id: `${sourceId}-network-${network.id}`,
                    source: sourceId,
                    target: `network-${network.id}`,
                    type: "floating-straight",
                    data: { label, color: NETWORK_LINE_COLOR },
                  });
                });
              }
            }
          }
        });
      }
    });

    const layouted = applyD3ForceLayout(allNodes, allEdges);
    if (!layouted) return layouted;
    // Children after every parent, with their frame-relative positions.
    return {
      ...layouted,
      updatedNodes: [...layouted.updatedNodes, ...childNodes],
    };
  };

  return { applySingleNetworkView, applyNetworksView };
}

import { Edge, Node } from "@xyflow/react";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  addNode,
  addEdge,
} from "@/modules/control-center/utils/graph-builder";
import { applyDrilledLayout } from "@/modules/control-center/utils/drilled-layout";
import {
  nodeYNudge,
  POLICY_COLUMN_Y_OFFSET,
} from "@/modules/control-center/utils/layouts";
import {
  FRAME_GRID_BASE_X,
  getLiveFrameGrid,
  isFrameNode,
  NETWORK_FRAME_FALLBACK_ROW,
  getResourcePolicyByGroups,
  packFrameGrid,
  SOURCE_NODE_HALF_HEIGHT,
  orderFrameResources,
  withFreshGroupCounts,
} from "@/modules/control-center/utils/helpers";
import { ViewResult } from "./types";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function useNetworkView() {
  const { selectedNetwork, layoutInitialized } = useCanvasState();
  const {
    policies,
    networks,
    networkResources,
    peers,
    groups,
    isLoading,
    isDataReady,
  } = useControlCenterData();

  // A policiesOverride is fresher than the SWR cache, so it also bypasses the
  // initialized-layout guard.
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

    networkPolicies.forEach((p) => {
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
            // No onClick, so clicks fall through to onNodeClick's group panel.
            data: { group: withFreshGroupCounts(group, groups), enabled },
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

        const sourceResource = rule.sourceResource;
        if (sourceResource?.id && sourceResource.type === "peer") {
          const peer = peers?.find((p) => p.id === sourceResource.id);
          if (peer) {
            addNode(allNodes, {
              id: `peer-${peer.id}`,
              type: "peerNode",
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

    // The drilled view and the draft drill-down must agree on this order.
    const resources = orderFrameResources(
      (network.resources || [])
        .map((r) => networkResources?.find((n) => n.id === r))
        .filter(Boolean) as NonNullable<typeof networkResources>,
      network.policies,
      effectivePolicies,
    );

    resources.forEach((resource) => {
      addNode(allNodes, {
        id: `resource-${resource.id}`,
        type: "resourceNode",
        // `drilled` suppresses the "- Network" suffix the header already shows.
        data: {
          resource,
          enabled: true,
          draftNetwork: { networkId: network.id, name: network.name },
          drilled: true,
        },
        position: { x: 0, y: 0 },
      });

      // The group sweep below only covers group-mediated policies.
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
              data: { group: withFreshGroupCounts(group, groups), enabled },
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
              // Without this React Flow picks the left handle instead.
              sourceHandle: "sr",
              target: `resource-${resource.id}`,
              type: "simple",
            });
          });

          ruleSourceGroups.forEach((group) => {
            addNode(allNodes, {
              id: `group-${group.id}`,
              type: "groupNode",
              data: { group: withFreshGroupCounts(group, groups), enabled },
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

    return applyDrilledLayout(allNodes, allEdges);
  };

  const buildNetworksView = (
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    // Appended after the layout: their positions are frame-relative, and
    // ReactFlow needs parents first.
    const childNodes: Node[] = [];

    networks!.forEach((network) => {
      const childResources = (network.resources ?? [])
        .map((rid) => networkResources?.find((r) => r.id === rid))
        .filter(Boolean) as NonNullable<typeof networkResources>;

      const networkPolicyObjs = (network.policies ?? [])
        .map((pid) =>
          (policiesOverride ?? policies!).find((po) => po.id === pid),
        )
        .filter(Boolean) as Policy[];

      // A destination group becomes a frame row only if one of the network's
      // resources belongs to it.
      const resourceIdSet = new Set(network.resources ?? []);
      const groupRows: Group[] = [];
      networkPolicyObjs.forEach((po) => {
        ((po.rules?.[0]?.destinations as Group[]) ?? []).forEach((g) => {
          if (!g?.id || groupRows.some((x) => x.id === g.id)) return;
          const hasNetworkResource = networkResources?.some(
            (r) =>
              resourceIdSet.has(r.id ?? "") &&
              ((r.groups ?? []) as (Group | string)[]).some(
                (gg) => (typeof gg === "string" ? gg : gg?.id) === g.id,
              ),
          );
          if (hasNetworkResource) {
            // The policy-embedded group carries no counts.
            groupRows.push(groups?.find((x) => x.id === g.id) ?? g);
          }
        });
      });

      // A resource covered by a group row is folded away, unless a policy
      // targets it directly.
      const groupRowIds = new Set(groupRows.map((g) => g.id));
      const groupRowMemberIds = new Set<string>();
      childResources.forEach((r) => {
        const inGroup = ((r.groups ?? []) as (Group | string)[]).some((gg) =>
          groupRowIds.has(typeof gg === "string" ? gg : gg?.id ?? ""),
        );
        if (inGroup && r.id) groupRowMemberIds.add(r.id);
      });
      const directTargetIds = new Set<string>();
      networkPolicyObjs.forEach((po) => {
        const dr = po.rules?.[0]?.destinationResource as
          | { id?: string }
          | undefined;
        if (dr?.id) directTargetIds.add(dr.id);
      });
      const foldedResources = childResources.filter(
        (r) =>
          !groupRowMemberIds.has(r.id ?? "") || directTargetIds.has(r.id ?? ""),
      );

      const orderedResources = orderFrameResources(
        foldedResources,
        network.policies,
        policiesOverride ?? policies,
      );

      // Seed the same grid the reconciling layout produces, or every frame
      // resizes right after mount.
      const grid = getLiveFrameGrid(foldedResources.length + groupRows.length);
      const networkEnabled =
        networkPolicyObjs.length === 0 ||
        networkPolicyObjs.some((po) => po.rules?.[0]?.enabled);
      allNodes.push({
        id: `network-${network.id}`,
        type: "networkNode",
        data: {
          network,
          frame: true,
          enabled: networkEnabled,
        },
        // No per-node `draggable`: it would override the global nodesDraggable
        // that focus mode relies on.
        position: { x: 0, y: 0 },
        style: { width: grid.width, height: grid.height },
      });
      orderedResources.forEach((resource, idx) => {
        // Group rows occupy the first cells.
        const i = groupRows.length + idx;
        childNodes.push({
          id: `resource-${resource.id}`,
          type: "resourceNode",
          parentId: `network-${network.id}`,
          position: grid.cellPosition(i),
          // Overflow past the visible cap starts hidden behind "+N more".
          hidden: i >= grid.visibleCount,
          selectable: false,
          // Live has no drag interception, so rows aren't draggable at all.
          draggable: false,
          style: { width: grid.childWidth, height: NETWORK_FRAME_FALLBACK_ROW },
          data: {
            resource,
            // Children are separate DOM nodes, so they dim with their frame.
            enabled: networkEnabled,
            draftNetwork: { networkId: network.id, name: network.name },
          },
        });
      });
      groupRows.forEach((g, i) => {
        childNodes.push({
          // A group's resources may span networks, so the id is per-network.
          id: `resource-group-${network.id}-${g.id}`,
          type: "resourceGroupNode",
          parentId: `network-${network.id}`,
          position: grid.cellPosition(i),
          hidden: i >= grid.visibleCount,
          selectable: false,
          draggable: false,
          style: { width: grid.childWidth, height: NETWORK_FRAME_FALLBACK_ROW },
          data: { group: g, enabled: networkEnabled, showHandles: false },
        });
      });

      const networkPolicies = network.policies || [];
      if (networkPolicies.length > 0) {
        networkPolicies.forEach((p) => {
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
                  data: { group, enabled },
                  position: { x: 0, y: 0 },
                });
                sourceIds.push(`group-${group.id}`);
              });

              if (sourcePeer) {
                addNode(allNodes, {
                  id: `peer-${sourcePeer.id}`,
                  type: "peerNode",
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

              if (sourceIds.length > 0) {
                addNode(allNodes, {
                  id: `policy-${policy.id}`,
                  type: "policyNode",
                  data: { policy, enabled },
                  position: { x: 0, y: 0 },
                });
                sourceIds.forEach((sourceId) => {
                  addEdge(allEdges, {
                    id: `${sourceId}-policy-${policy.id}`,
                    source: sourceId,
                    target: `policy-${policy.id}`,
                    type: "smart",
                    data: { enabled, policy },
                  });
                });
                addEdge(allEdges, {
                  id: `policy-${policy.id}-network-${network.id}`,
                  source: `policy-${policy.id}`,
                  target: `network-${network.id}`,
                  type: "smart",
                  data: { enabled, policy },
                });
              }
            }
          }
        });
      }
    });

    const frames = allNodes.filter((n) => isFrameNode(n));
    const policyNodes = allNodes.filter((n) => n.type === "policyNode");
    const sources = allNodes.filter(
      (n) => !isFrameNode(n) && n.type !== "policyNode",
    );
    const displayName = (n: Node) =>
      (
        (n.data as { group?: { name?: string }; peer?: { name?: string } })
          ?.group?.name ??
        (n.data as { peer?: { name?: string } })?.peer?.name ??
        ""
      ).toLowerCase();
    sources.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    // Same anchors as the peer/group/user views, so nodes don't jump on a view
    // switch.
    const SOURCE_SPACING = 160;
    const sourcesHeight = (sources.length - 1) * SOURCE_SPACING;
    sources.forEach((n, i) => {
      n.position = {
        x: 0,
        y: -sourcesHeight / 2 + i * SOURCE_SPACING + nodeYNudge(n.type),
      };
    });
    const policyName = (n: Node) =>
      ((n.data as { policy?: { name?: string } })?.policy?.name ?? "")
        .toLowerCase();
    policyNodes.sort((a, b) => policyName(a).localeCompare(policyName(b)));
    const POLICY_SPACING = 90;
    const policiesHeight = (policyNodes.length - 1) * POLICY_SPACING;
    policyNodes.forEach((n, i) => {
      n.position = {
        x: 500,
        y: -policiesHeight / 2 + i * POLICY_SPACING + POLICY_COLUMN_Y_OFFSET,
      };
    });
    packFrameGrid(frames, FRAME_GRID_BASE_X, SOURCE_NODE_HALF_HEIGHT);

    return {
      updatedNodes: [...allNodes, ...childNodes],
      updatedEdges: allEdges,
    };
  };

  // Building at switch time visibly froze the tab change. Deps must cover
  // everything isDataReady() checks, or the memo caches `undefined` forever.
  const precomputedNetworksView = useMemo(
    () => (isDataReady() ? buildNetworksView() : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- these helpers are re-created every render
    [networks, networkResources, policies, peers, groups, isLoading, selectedNetwork],
  );

  const applyNetworksView = (
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;
    if (layoutInitialized && !policiesOverride) return;
    if (policiesOverride) return buildNetworksView(policiesOverride);
    return precomputedNetworksView;
  };

  return { applySingleNetworkView, applyNetworksView };
}

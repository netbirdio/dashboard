import { Edge, Node } from "@xyflow/react";
import { useMemo } from "react";
import { forEach } from "lodash";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import {
  addNode,
  addEdge,
} from "@/modules/control-center/utils/graph-builder";
import { applyDrilledLayout } from "@/modules/control-center/utils/drilled-layout";
import {
  FRAME_GRID_BASE_X,
  getLiveFrameGrid,
  isFrameNode,
  NETWORK_FRAME_FALLBACK_ROW,
  getResourcePolicyByGroups,
  packFrameGrid,
  SOURCE_NODE_HALF_HEIGHT,
  orderFrameResources,
} from "@/modules/control-center/utils/helpers";
import { ViewResult } from "./types";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function useNetworkView() {
  const { selectedNetwork, layoutInitialized, forceSingleGroupViewRef } =
    useCanvasState();
  const {
    policies,
    networks,
    networkResources,
    peers,
    groups,
    isLoading,
    isDataReady,
  } = useControlCenterData();

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

    // Same policy-targeted-first order as the frames (orderFrameResources) —
    // the drilled view and the draft drill-down must agree on the column.
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

  const buildNetworksView = (
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;

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

      // A network whose policies are ALL disabled dims like a disabled
      // destination elsewhere (no policies → normal).
      const networkPolicyObjs = (network.policies ?? [])
        .map((pid) =>
          (policiesOverride ?? policies!).find((po) => po.id === pid),
        )
        .filter(Boolean) as Policy[];

      // Destination RESOURCE-GROUPS live INSIDE the frame as rows, exactly
      // like the draft build: a destination group qualifies when one of the
      // network's resources belongs to it. Peer-only destination groups are
      // SKIPPED here — they grant peer access, not network access, and have
      // no business floating next to a network.
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
          if (hasNetworkResource) groupRows.push(g);
        });
      });

      // Policy-reached resources sort to the top of the frame — shared rule
      // with the draft build (orderFrameResources) so live and draft frames
      // agree on the order.
      const orderedResources = orderFrameResources(
        childResources,
        network.policies,
        policiesOverride ?? policies,
      );

      // Seed the frame with the SAME grid the reconciling layout produces
      // (2 cols, visible cap, fallback rows) — a mismatched seed made every
      // frame resize and its "+N more" cell shift right after mount.
      const grid = getLiveFrameGrid(childResources.length + groupRows.length);
      const networkEnabled =
        networkPolicyObjs.length === 0 ||
        networkPolicyObjs.some((po) => po.rules?.[0]?.enabled);
      allNodes.push({
        id: `network-${network.id}`,
        type: "networkNode",
        data: {
          network,
          selectedNetwork,
          frame: true,
          enabled: networkEnabled,
        },
        // No explicit draggable — a per-node `draggable: true` OVERRIDES
        // ReactFlow's global nodesDraggable, which must win in focus mode
        // (group panel open → dragging pans, never moves nodes).
        position: { x: 0, y: 0 },
        style: { width: grid.width, height: grid.height },
      });
      orderedResources.forEach((resource, idx) => {
        // Group rows occupy the FIRST cells (same order as the draft build).
        const i = groupRows.length + idx;
        childNodes.push({
          id: `resource-${resource.id}`,
          type: "resourceNode",
          parentId: `network-${network.id}`,
          position: grid.cellPosition(i),
          // Overflow past the visible cap starts hidden (the "+N more" cell
          // stands in for it) — the reconciler keeps it that way.
          hidden: i >= grid.visibleCount,
          selectable: false,
          // Draft row-drags move the whole frame (useDragToGroup intercepts);
          // live has no such interception, so rows aren't draggable at all.
          draggable: false,
          // Same fixed slot size the frame layout stamps — seed === final.
          style: { width: grid.childWidth, height: NETWORK_FRAME_FALLBACK_ROW },
          data: {
            resource,
            // Children are separate DOM nodes — they dim with their frame.
            enabled: networkEnabled,
            draftNetwork: { networkId: network.id, name: network.name },
          },
        });
      });
      groupRows.forEach((g, i) => {
        childNodes.push({
          // Per-network id — a group's resources may span networks, and a
          // node id must be unique.
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
                  // No onClick — clicking opens the group panel + focus
                  // highlight via onNodeClick (like draft), not navigation.
                  data: { group, enabled },
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

              // POLICY NODES in the overview, like the draft build: source
              // → policy → network, all smart edges — live and draft read
              // the same.
              if (hidePolicies && sourceIds.length > 0) {
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

    // Same arrangement as the draft build: sources (groups/peers) left,
    // policies in the middle column, network frames in the staggered grid
    // on the right.
    const frames = allNodes.filter((n) => isFrameNode(n));
    const policyNodes = allNodes.filter((n) => n.type === "policyNode");
    const sources = allNodes.filter(
      (n) => !isFrameNode(n) && n.type !== "policyNode",
    );
    // Name-sorted columns — the draft build sorts identically, so both
    // modes read the same top-to-bottom.
    const displayName = (n: Node) =>
      (
        (n.data as { group?: { name?: string }; peer?: { name?: string } })
          ?.group?.name ??
        (n.data as { peer?: { name?: string } })?.peer?.name ??
        ""
      ).toLowerCase();
    sources.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    // Same anchors as the peer/group/user views (sources top-anchored at
    // x 0, policies at x 500 / +14) so a policy and its source keep their
    // position when switching views; the frame grid centers on the source
    // column's midline (+half height) instead of shifting the columns up.
    const SOURCE_SPACING = 160;
    const sourcesHeight = (sources.length - 1) * SOURCE_SPACING;
    sources.forEach((n, i) => {
      n.position = {
        x: 0,
        y: -sourcesHeight / 2 + i * SOURCE_SPACING,
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
        y: -policiesHeight / 2 + i * POLICY_SPACING + 14,
      };
    });
    packFrameGrid(frames, FRAME_GRID_BASE_X, SOURCE_NODE_HALF_HEIGHT);

    return {
      updatedNodes: [...allNodes, ...childNodes],
      updatedEdges: allEdges,
    };
  };

  // PRECOMPUTED while the user is on another view (this hook lives in the
  // always-mounted UI provider and the data is fetched globally): the build
  // runs a synchronous d3-force simulation, and computing it at switch time
  // visibly froze the tab change. The memo re-runs only when the underlying
  // data (or the selected network) changes.
  // Deps must cover EVERYTHING isDataReady() checks — if a late-loading
  // dataset (groups) wasn't a dep, the memo cached `undefined` forever and
  // the networks tab rendered nothing.
  const precomputedNetworksView = useMemo(
    () => (isDataReady() ? buildNetworksView() : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networks, networkResources, policies, peers, groups, isLoading, selectedNetwork],
  );

  const applyNetworksView = (
    policiesOverride?: Policy[],
  ): ViewResult | undefined => {
    if (!isDataReady()) return;
    if (layoutInitialized && !policiesOverride) return;
    // Fresh build for in-place refreshes (policy just saved); the cached
    // result everywhere else.
    if (policiesOverride) return buildNetworksView(policiesOverride);
    return precomputedNetworksView;
  };

  return { applySingleNetworkView, applyNetworksView };
}

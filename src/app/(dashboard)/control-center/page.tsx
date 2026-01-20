"use client";

import "@xyflow/react/dist/style.css";
import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import { SmallBadge } from "@components/ui/SmallBadge";
import useFetchApi from "@utils/api";
import {
  Background,
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { forEach, orderBy, sortBy } from "lodash";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  MessageSquareShareIcon,
  NetworkIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import { AccessControlUpdateModal } from "@/modules/access-control/AccessControlModal";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { ControlCenterCurrentUserBadge } from "@/modules/control-center/user/ControlCenterCurrentUserBadge";
import { EDGE_TYPES } from "@/modules/control-center/utils/edges";
import {
  getFirstGroup,
  getPolicyProtocolAndPortText,
  getResourcePolicyByGroups,
} from "@/modules/control-center/utils/helpers";
import {
  applyD3ForceLayout,
  applyD3HierarchicalLayout,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
} from "@/modules/control-center/utils/layouts";
import { NODE_TYPES } from "@/modules/control-center/utils/nodes";

export default function ControlCenter() {
  return (
    <ReactFlowProvider>
      <PoliciesProvider>
        <ControlCenterView />
      </PoliciesProvider>
    </ReactFlowProvider>
  );
}

function ControlCenterView() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlow = useReactFlow();
  const [layoutInitialized, setLayoutInitialized] = useState(false);
  const [forceLayoutChange, setForceLayoutChange] = useState(false);
  const { loggedInUser } = useLoggedInUser();

  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const initialTab = useMemo(() => {
    if (queryTab === "peers") return FlowView.PEERS;
    if (queryTab === "users") return FlowView.USERS;
    if (queryTab === "groups") return FlowView.GROUPS;
    if (queryTab === "networks") return FlowView.NETWORKS;
    return FlowView.PEERS;
  }, [queryTab]);
  const [currentView, setCurrentView] = useState<FlowView>(initialTab);

  const { data: policies, isLoading: isPoliciesLoading } =
    useFetchApi<Policy[]>("/policies");
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");
  const { data: networks, isLoading: isNetworksLoading } =
    useFetchApi<Network[]>("/networks");
  const { data: networkResources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: groups, isLoading: isGroupsLoading } =
    useFetchApi<Group[]>("/groups");
  const { data: users, isLoading: isUsersLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
  );

  const isLoading =
    isPoliciesLoading ||
    isPeersLoading ||
    isNetworksLoading ||
    isResourcesLoading ||
    isGroupsLoading ||
    isUsersLoading;

  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [previousSelectedUser, setPreviousSelectedUser] = useState("");

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [selectedDestinationGroup, setSelectedDestinationGroup] = useState("");

  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  const networkOptions: SelectOption[] = useMemo(() => {
    let allNetworks = sortBy(
      networks?.map(
        (network) =>
          ({
            value: network.id,
            label: network.name,
            icon: NetworkIcon,
          }) as SelectOption,
      ) || [],
      "label",
      "asc",
    );
    allNetworks.unshift({
      value: "",
      label: "All Networks",
      icon: () => <LayoutGridIcon size={14} />,
    } as SelectOption);
    return allNetworks;
  }, [networks]);

  const onDestinationGroupSelect = useCallback(
    (groupId: string) => {
      const isTogglingSameGroup = selectedDestinationGroup === groupId;
      const newSelectedGroup = isTogglingSameGroup ? "" : groupId;

      setSelectedDestinationGroup(newSelectedGroup);

      if (
        currentView !== FlowView.PEERS &&
        currentView !== FlowView.GROUPS &&
        currentView !== FlowView.USERS
      ) {
        setLayoutInitialized(false);
        return;
      }

      const getPeersAndResources = (groupId: string) => {
        const resources =
          networkResources?.filter((n) => {
            const resourceGroupIds =
              n.groups?.map((g) => (g as Group)?.id) || [];
            return resourceGroupIds.includes(groupId);
          }) || [];

        const groupPeers =
          peers?.filter((p) => {
            const peerGroupIds = p.groups?.map((g) => g.id) || [];
            return peerGroupIds.includes(groupId);
          }) || [];

        return { resources, peers: groupPeers };
      };

      const addExpandedNodes = (groupId: string, baseNodes: Node[]) => {
        const { resources, peers } = getPeersAndResources(groupId);
        const destinationGroupNode = baseNodes.find(
          (node) => node.id === `group-${groupId}`,
        );

        if (!destinationGroupNode) return [];

        const baseX = destinationGroupNode.position.x + 300;
        const groupCenterY = destinationGroupNode.position.y;
        const nodeSpacing = 80;
        const totalNodes = peers.length + resources.length;
        const totalHeight = (totalNodes - 1) * nodeSpacing;
        const startY = groupCenterY - totalHeight / 2;

        const newNodes: Node[] = [];
        let currentY = startY;

        // Add peer nodes
        peers.forEach((peer) => {
          newNodes.push({
            id: `peer-${peer.id}`,
            type:
              currentView === FlowView.PEERS ? "expandedGroupPeer" : "peerNode",
            data: { peer },
            position: { x: baseX, y: currentY },
          });
          currentY += nodeSpacing;
        });

        // Add resource nodes
        resources.forEach((resource) => {
          newNodes.push({
            id: `resource-${resource.id}`,
            type: "resourceNode",
            data: { resource },
            position: { x: baseX, y: currentY },
          });
          currentY += nodeSpacing;
        });

        return newNodes;
      };

      const addExpandedEdges = (groupId: string) => {
        const { resources, peers } = getPeersAndResources(groupId);
        const newEdges: Edge[] = [];

        // Add peer edges
        peers.forEach((peer) => {
          newEdges.push({
            id: `group-peer-${groupId}-${peer.id}`,
            source: `group-${groupId}`,
            target: `peer-${peer.id}`,
            type: "simple",
            data: { enabled: true },
          });
        });

        // Add resource edges
        resources.forEach((resource) => {
          newEdges.push({
            id: `group-resource-${groupId}-${resource.id}`,
            source: `group-${groupId}`,
            target: `resource-${resource.id}`,
            type: "simple",
            data: { enabled: true },
          });
        });

        return newEdges;
      };

      // Update nodes
      setNodes((prevNodes) => {
        // Remove previous nodes
        const baseNodes = prevNodes.filter(
          (node) =>
            !node.id.startsWith(`peer-`) && !node.id.startsWith(`resource-`),
        );
        // If toggling a new group, add its nodes
        if (!isTogglingSameGroup) {
          const expandedNodes = addExpandedNodes(groupId, baseNodes);
          return [...baseNodes, ...expandedNodes];
        }
        return baseNodes;
      });

      // Update edges
      setEdges((prevEdges) => {
        // Remove all previously expanded peer/resource edges
        const baseEdges = prevEdges.filter(
          (edge) =>
            !edge.id.includes(`group-peer-`) &&
            !edge.id.includes(`group-resource-`),
        );
        // If expanding a new group, add its edges
        if (!isTogglingSameGroup) {
          const expandedEdges = addExpandedEdges(groupId);
          return [...baseEdges, ...expandedEdges];
        }
        return baseEdges;
      });
    },
    [
      selectedDestinationGroup,
      currentView,
      setNodes,
      setEdges,
      networkResources,
      peers,
    ],
  );

  const applySingleGroupView = (groupId: string) => {
    if (!policies || isLoading) return;
    if (!groups || isGroupsLoading) return;
    if (!networks || isNetworksLoading) return;
    if (!networkResources || isResourcesLoading) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const groupPolicies = sortBy(
      policies.filter((policy) => {
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
      const nodeExists = allNodes.some((n) => n.id === `policy-${policy.id}`);
      if (!nodeExists) {
        allNodes.push({
          id: `policy-${policy.id}`,
          type: "policyNode",
          data: {
            policy,
          },
          position: { x: 0, y: 0 },
        });
      }

      const edgeExists = allEdges.some(
        (e) => e.id === `group-policy-${groupId}-${policy.id}`,
      );
      if (!edgeExists) {
        allEdges.push({
          id: `group-policy-${groupId}-${policy.id}`,
          source: `select-group-node`,
          target: `policy-${policy.id}`,
          type: "in",
          data: { enabled, type: "bezier" },
        });
      }

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
            data: {
              group: destination,
            },
            position: { x: 0, y: 0 },
          });

          if (selectedDestinationGroup == destination.id) {
            const resources = networkResources.filter((n) => {
              const resourceGroupIds =
                n.groups?.map((g) => (g as Group)?.id) || [];
              return resourceGroupIds.includes(destination.id);
            });

            const destinationPeers = peers?.filter((p) => {
              const peerGroupIds = p.groups?.map((g) => g.id) || [];
              return peerGroupIds.includes(destination.id);
            });

            destinationPeers?.forEach((peer) => {
              const peerNodeId = `peer-${peer.id}`;
              const peerNodeExists = allNodes.some((n) => n.id === peerNodeId);
              if (!peerNodeExists) {
                allNodes.push({
                  id: peerNodeId,
                  type: "peerNode",
                  data: { peer },
                  position: { x: 0, y: 0 },
                });
              } else {
                allNodes.forEach((n) => {
                  if (n.id === peerNodeId) {
                    n.data = {
                      ...n.data,
                      enabled,
                    };
                  }
                });
              }

              const peerEdgeExists = allEdges.some(
                (e) => e.id === `group-peer-${destination.id}-${peer.id}`,
              );
              if (!peerEdgeExists) {
                allEdges.push({
                  id: `group-peer-${destination.id}-${peer.id}`,
                  source: `group-${destination.id}`,
                  target: peerNodeId,
                  type: "simple",
                });
              } else {
                allEdges.forEach((e) => {
                  if (e.id === `group-peer-${destination.id}-${peer.id}`) {
                    e.data = {
                      ...e.data,
                      enabled,
                    };
                  }
                });
              }
            });

            // add resource nodes
            resources.forEach((resource) => {
              const resourceNodeId = `resource-${resource.id}`;
              const resourceNodeExists = allNodes.some(
                (n) => n.id === resourceNodeId,
              );
              if (!resourceNodeExists) {
                allNodes.push({
                  id: resourceNodeId,
                  type: "resourceNode",
                  data: { resource },
                  position: { x: 0, y: 0 },
                });
              } else {
                allNodes.forEach((n) => {
                  if (n.id === resourceNodeId) {
                    n.data = {
                      ...n.data,
                      enabled,
                    };
                  }
                });
              }

              const resourceEdgeExists = allEdges.some(
                (e) =>
                  e.id === `group-resource-${destination.id}-${resource.id}`,
              );
              if (!resourceEdgeExists) {
                allEdges.push({
                  id: `group-resource-${destination.id}-${resource.id}`,
                  source: `group-${destination.id}`,
                  target: resourceNodeId,
                  type: "simple",
                  data: {
                    enabled,
                  },
                });
              } else {
                allEdges.forEach((e) => {
                  if (
                    e.id === `group-resource-${destination.id}-${resource.id}`
                  ) {
                    e.data = {
                      ...e.data,
                      enabled,
                    };
                  }
                });
              }
            });
          }
        } else {
          allNodes.forEach((n) => {
            if (n.id === destinationNodeId) {
              n.data = {
                ...n.data,
                enabled,
              };
            }
          });
        }

        const destinationEdgeExists = allEdges.some(
          (e) => e.id === `policy-group-${policy.id}-${destination.id}`,
        );
        if (!destinationEdgeExists) {
          allEdges.push({
            id: `policy-group-${policy.id}-${destination.id}`,
            source: `policy-${policy.id}`,
            target: destinationNodeId,
            type: "in",
            data: { enabled, type: "bezier" },
          });
        } else {
          allEdges.forEach((e) => {
            if (e.id === `policy-group-${policy.id}-${destination.id}`) {
              e.data = {
                ...e.data,
                enabled,
              };
            }
          });
        }
      });

      // Add destination resource nodes
      addDestinationResourceNodes(policy, allNodes, allEdges);
    });

    return applyD3HierarchicalLayout(allNodes, allEdges, 400, 120, "group", {
      policy: { width: 500, spacing: 60 },
      destinationGroup: { width: 1000, spacing: 100 },
      peersAndResources: { width: 1400, spacing: 80 },
    });
  };

  const applySingleNetworkView = (networkId: string) => {
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

      const existsPolicy = allNodes.find(
        (node) => node.id === `policy-${policy.id}`,
      );
      if (!existsPolicy) {
        allNodes.push({
          id: `policy-${policy.id}`,
          type: "policyNode",
          data: {
            policy,
            enabled,
          },
          position: { x: 0, y: 0 },
        });
      }

      const rule = policy.rules?.[0];
      if (rule) {
        const ruleSourceGroups = (rule.sources as Group[]) || [];

        ruleSourceGroups.forEach((group) => {
          if (!allNodes.find((node) => node.id === `group-${group.id}`)) {
            allNodes.push({
              id: `group-${group.id}`,
              type: "groupNode",
              data: {
                group,
                enabled,
                onClick: () => forceSingleGroupView(group.id || ""),
              },
              position: { x: 0, y: 0 },
            });
          }

          const edgeExists = allEdges.find(
            (edge) => edge.id === `group-${group.id}-policy-${policy.id}`,
          );
          if (!edgeExists) {
            allEdges.push({
              id: `group-${group.id}-policy-${policy.id}`,
              source: `group-${group.id}`,
              target: `policy-${policy.id}`,
              type: "in",
              data: {
                enabled,
                type: "bezier",
              },
            });
          }
        });
      }
    });

    const resources = network.resources || [];

    resources.forEach((r) => {
      const resource = networkResources?.find((n) => n.id === r);
      if (!resource) return;

      const existsResource = allNodes.find(
        (node) => node.id === `resource-${resource.id}`,
      );
      if (!existsResource) {
        allNodes.push({
          id: `resource-${resource.id}`,
          type: "resourceNode",
          data: {
            resource,
          },
          position: { x: 0, y: 0 },
        });
      }

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

            if (!allNodes.find((node) => node.id === `group-${group.id}`)) {
              allNodes.push({
                id: `group-${group.id}`,
                type: "destinationGroupNode",
                data: {
                  group,
                  enabled,
                  hoverable: false,
                },
                position: { x: 0, y: 0 },
              });
            }

            // add edge from policy to destination group
            const policyDestinationEdgeExists = allEdges.find(
              (edge) => edge.id === `policy-${policy.id}-group-${group.id}`,
            );
            if (!policyDestinationEdgeExists) {
              allEdges.push({
                id: `policy-${policy.id}-group-${group.id}`,
                source: `policy-${policy.id}`,
                target: `group-${group.id}`,
                type: "in",
                data: {
                  enabled,
                  type: "bezier",
                },
              });
            }

            // add edge from destination group to resource
            const groupResourceEdgeExists = allEdges.find(
              (edge) => edge.id === `group-${group.id}-resource-${resource.id}`,
            );
            if (!groupResourceEdgeExists) {
              allEdges.push({
                id: `group-${group.id}-resource-${resource.id}`,
                source: `group-${group.id}`,
                target: `resource-${resource.id}`,
                type: "simple",
              });
            }
          });

          ruleSourceGroups.forEach((group) => {
            // Ensure the group node exists
            if (!allNodes.find((node) => node.id === `group-${group.id}`)) {
              allNodes.push({
                id: `group-${group.id}`,
                type: "groupNode",
                data: {
                  group,
                  enabled,
                },
                position: { x: 0, y: 0 },
              });
            }

            const groupPolicyEdgeExists = allEdges.find(
              (edge) => edge.id === `group-${group.id}-policy-${policy.id}`,
            );
            if (!groupPolicyEdgeExists) {
              allEdges.push({
                id: `group-${group.id}-policy-${policy.id}`,
                source: `group-${group.id}`,
                target: `policy-${policy.id}`,
                type: "in",
                data: {
                  enabled,
                  type: "bezier",
                },
              });
            }
          });
        }
      });
    });

    return applyD3HierarchicalLayout(allNodes, allEdges, 400, 120, "network", {
      policy: { width: 500, spacing: 60 },
      destinationGroup: { width: 1000, spacing: 100 },
      peersAndResources: { width: 1400, spacing: 80 },
    });
  };

  const applyNetworksView = () => {
    if (!policies || isLoading) return;
    if (!groups || isGroupsLoading) return;
    if (!networks || isNetworksLoading) return;
    if (!networkResources || isResourcesLoading) return;

    // Skip layout updates if already initialized
    if (layoutInitialized) {
      return; // Exit early for initialized layouts
    }

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const hidePolicies = !selectedNetwork;

    // Process networks
    networks.forEach((network) => {
      allNodes.push({
        id: `network-${network.id}`,
        type: "networkNode",
        data: {
          network,
          selectedNetwork,
        },
        draggable: true,
        position: { x: 0, y: 0 },
      });

      const networkPolicies = network.policies || [];
      if (networkPolicies.length > 0) {
        forEach(networkPolicies, (p) => {
          const policy = policies.find((policyItem) => policyItem.id === p);
          if (policy) {
            const enabled = policy.rules?.[0]?.enabled;

            const rule = policy.rules?.[0];
            if (rule) {
              const ruleSourceGroups = (rule.sources as Group[]) || [];

              ruleSourceGroups.forEach((group) => {
                if (!allNodes.find((node) => node.id === `group-${group.id}`)) {
                  allNodes.push({
                    id: `group-${group.id}`,
                    type: "groupNode",
                    data: {
                      group,
                      enabled,
                      onClick: () => forceSingleGroupView(group.id || ""),
                    },
                    position: { x: 0, y: 0 },
                  });
                }

                const edge2Exists = allEdges.find(
                  (edge) =>
                    edge.id === `group-${group.id}-network-${network.id}`,
                );
                if (!edge2Exists && hidePolicies) {
                  const label = getPolicyProtocolAndPortText(policy);
                  allEdges.push({
                    id: `group-${group.id}-network-${network.id}`,
                    source: `group-${group.id}`,
                    target: `network-${network.id}`,
                    type: "floating-straight",
                    data: { label: label },
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

  const applyPeerView = (peerId: string) => {
    if (!policies || isLoading) return;
    if (!groups || isGroupsLoading) return;
    if (!networks || isNetworksLoading) return;
    if (!networkResources || isResourcesLoading) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const peer = peers?.find((p) => p.id === peerId);
    if (!peer) return;

    const peerGroups = peer.groups || [];

    const peerPolicies = sortBy(
      policies?.filter((p) => {
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
      const nodeExists = allNodes.some((n) => n.id === `policy-${policy.id}`);
      if (!nodeExists) {
        allNodes.push({
          id: `policy-${policy.id}`,
          type: "policyNode",
          data: { policy },
          position: { x: 0, y: 0 },
        });
      }

      const edgeExists = allEdges.some(
        (e) => e.id === `peer-policy-${peer.id}-${policy.id}`,
      );
      if (!edgeExists) {
        allEdges.push({
          id: `peer-policy-${peer.id}-${policy.id}`,
          source: `select-peer-node`,
          target: `policy-${policy.id}`,
          type: "in",
          data: { enabled, type: "bezier" },
        });
      }
      // add destination groups
      const destinations = policy.rules?.[0].destinations as Group[];
      destinations?.forEach((destination) => {
        const destinationNodeId = `group-${destination.id}`;
        const destinationNodeExists = allNodes.some(
          (n) => n.id === destinationNodeId,
        );

        if (!destinationNodeExists) {
          allNodes.push({
            id: destinationNodeId,
            type: "destinationGroupNode",
            data: {
              group: destination,
            },
            position: { x: 0, y: 0 },
          });
        } else {
          allNodes.forEach((n) => {
            if (n.id === destinationNodeId) {
              n.data = {
                ...n.data,
                enabled,
              };
            }
          });
        }
        const destinationEdgeExists = allEdges.some(
          (e) => e.id === `policy-group-${policy.id}-${destination.id}`,
        );
        if (!destinationEdgeExists) {
          allEdges.push({
            id: `policy-group-${policy.id}-${destination.id}`,
            source: `policy-${policy.id}`,
            target: destinationNodeId,
            type: "in",
            data: { enabled, type: "bezier" },
          });
        }

        if (selectedDestinationGroup == destination.id) {
          const resources = networkResources.filter((n) => {
            const resourceGroupIds =
              n.groups?.map((g) => (g as Group)?.id) || [];
            return resourceGroupIds.includes(destination.id);
          });

          const destinationPeers = peers?.filter((p) => {
            const peerGroupIds = p.groups?.map((g) => g.id) || [];
            return peerGroupIds.includes(destination.id);
          });

          // add peer nodes
          destinationPeers?.forEach((peer) => {
            const peerNodeId = `peer-${peer.id}`;
            const peerNodeExists = allNodes.some((n) => n.id === peerNodeId);
            if (!peerNodeExists) {
              allNodes.push({
                id: peerNodeId,
                type: "expandedGroupPeer",
                data: {
                  peer,
                  enabled,
                },
                position: { x: 0, y: 0 },
              });
            } else {
              allNodes.forEach((n) => {
                if (n.id === peerNodeId) {
                  n.data = {
                    ...n.data,
                    enabled,
                  };
                }
              });
            }

            const peerEdgeExists = allEdges.some(
              (e) => e.id === `group-peer-${destination.id}-${peer.id}`,
            );
            if (!peerEdgeExists) {
              allEdges.push({
                id: `group-peer-${destination.id}-${peer.id}`,
                source: `group-${destination.id}`,
                target: peerNodeId,
                type: "simple",
                data: {
                  enabled,
                },
              });
            } else {
              allEdges.forEach((e) => {
                if (e.id === `group-peer-${destination.id}-${peer.id}`) {
                  e.data = {
                    ...e.data,
                    enabled,
                  };
                }
              });
            }
          });

          // add resource nodes
          resources.forEach((resource) => {
            const resourceNodeId = `resource-${resource.id}`;
            const resourceNodeExists = allNodes.some(
              (n) => n.id === resourceNodeId,
            );
            if (!resourceNodeExists) {
              allNodes.push({
                id: resourceNodeId,
                type: "resourceNode",
                data: {
                  resource,
                  enabled,
                },
                position: { x: 0, y: 0 },
              });
            } else {
              allNodes.forEach((n) => {
                if (n.id === resourceNodeId) {
                  n.data = {
                    ...n.data,
                    enabled,
                  };
                }
              });
            }

            const resourceEdgeExists = allEdges.some(
              (e) => e.id === `group-resource-${destination.id}-${resource.id}`,
            );
            if (!resourceEdgeExists) {
              allEdges.push({
                id: `group-resource-${destination.id}-${resource.id}`,
                source: `group-${destination.id}`,
                target: resourceNodeId,
                type: "simple",
                data: {
                  enabled,
                },
              });
            } else {
              allEdges.forEach((e) => {
                if (
                  e.id === `group-resource-${destination.id}-${resource.id}`
                ) {
                  e.data = {
                    ...e.data,
                    enabled,
                  };
                }
              });
            }
          });
        }
      });

      // Add destination resource nodes
      addDestinationResourceNodes(policy, allNodes, allEdges);
    });

    return applyD3HierarchicalLayout(allNodes, allEdges, 400, 120, "peer", {
      policy: { width: 500, spacing: 60 },
      destinationGroup: { width: 1000, spacing: 100 },
      peersAndResources: { width: 1400, spacing: 80 },
    });
  };

  const addDestinationResourceNodes = (
    policy: Policy,
    nodes: Node[],
    edges: Edge[],
  ) => {
    const destinationPolicyResource = policy?.rules?.[0].destinationResource;
    const enabled = policy.enabled;

    if (destinationPolicyResource) {
      const type = destinationPolicyResource.type;
      const peer = peers?.find((p) => p.id === destinationPolicyResource.id);
      const resource = networkResources?.find(
        (r) => r.id === destinationPolicyResource.id,
      );
      const nodeId = `destination-resource-${destinationPolicyResource.id}`;
      const nodeExists = nodes.some((n) => n.id === nodeId);
      if (!nodeExists) {
        if (type === "peer" && peer) {
          nodes.push({
            id: nodeId,
            type: "destinationResourceNode",
            data: {
              peer: peer,
              enabled,
              className: "pl-3",
            },
            position: { x: 0, y: 0 },
          });
        } else if (resource) {
          nodes.push({
            id: nodeId,
            type: "destinationResourceNode",
            data: {
              resource: resource,
              enabled,
              className: "pl-3",
            },
            position: { x: 0, y: 0 },
          });
        }
      } else {
        nodes.forEach((n) => {
          if (n.id === nodeId) {
            n.data = {
              ...n.data,
              enabled,
            };
          }
        });
      }

      const edgeExists = edges.some(
        (e) => e.id === `policy-dest-resource-${policy.id}-${nodeId}`,
      );
      if (!edgeExists) {
        edges.push({
          id: `policy-dest-resource-${policy.id}-${nodeId}`,
          source: `policy-${policy.id}`,
          target: nodeId,
          type: "in",
          data: { enabled, type: "bezier" },
        });
      }
    }
  };

  const applyUserView = (userId: string) => {
    if (!policies || isLoading) return;
    if (!groups || isGroupsLoading) return;
    if (!networks || isNetworksLoading) return;
    if (!networkResources || isResourcesLoading) return;

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    // Get all peers for this user
    const userPeers = peers?.filter((p) => p.user_id === userId) || [];
    if (userPeers.length === 0) {
      return applyD3HierarchicalLayout([], [], 400, 120, "user", {
        policy: { width: 500, spacing: 60 },
        destinationGroup: { width: 1000, spacing: 100 },
        peersAndResources: { width: 1400, spacing: 80 },
      });
    }

    // Add peer nodes
    userPeers.forEach((peer, index) => {
      allNodes.push({
        id: `source-peer-${peer.id}`,
        type: "sourcePeerNode",
        data: {
          peer,
          enabled: true,
          onClick: () => {
            setPreviousSelectedUser(userId);
            forceSinglePeerView(peer.id || "", userId);
          },
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
      policies?.filter((p) => {
        const rule = p.rules?.[0];
        if (!rule) return false;
        const sources = rule.sources as Group[];
        return sources?.some((d) => allUserGroups.includes(d.id));
      }),
      "enabled",
      "desc",
    );

    // Add policies and their connections
    userPolicies?.forEach((policy, policyIndex) => {
      const enabled = policy.enabled;
      const policyNodeId = `policy-${policy.id}`;

      allNodes.push({
        id: policyNodeId,
        type: "policyNode",
        data: { policy },
        position: { x: 600, y: policyIndex * 120 },
      });

      // Add peer to policy edges
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
            target: policyNodeId,
            type: "in",
            data: { enabled, type: "bezier" },
          });
        }
      });

      // Add destination groups
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
            data: {
              group: destination,
            },
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
            type: "in",
            data: { enabled, type: "bezier" },
          });
        }

        // Add expanded destination group content if selected
        if (selectedDestinationGroup === destination.id) {
          const resources = networkResources.filter((n) => {
            const resourceGroupIds =
              n.groups?.map((g) => (g as Group)?.id) || [];
            return resourceGroupIds.includes(destination.id);
          });

          const destinationPeers = peers?.filter((p) => {
            const peerGroupIds = p.groups?.map((g) => g.id) || [];
            return peerGroupIds.includes(destination.id);
          });

          // Add peer nodes
          destinationPeers?.forEach((peer, peerIndex) => {
            const peerNodeId = `dest-peer-${peer.id}`;
            const peerNodeExists = allNodes.some((n) => n.id === peerNodeId);
            if (!peerNodeExists) {
              allNodes.push({
                id: peerNodeId,
                type: "peerNode",
                data: { peer },
                position: { x: 1200, y: policyIndex * 120 + peerIndex * 80 },
              });
            }

            const peerEdgeExists = allEdges.some(
              (e) => e.id === `group-peer-${destination.id}-${peer.id}`,
            );
            if (!peerEdgeExists) {
              allEdges.push({
                id: `group-peer-${destination.id}-${peer.id}`,
                source: destinationNodeId,
                target: peerNodeId,
                type: "simple",
                data: { enabled },
              });
            }
          });

          // Add resource nodes
          resources.forEach((resource, resourceIndex) => {
            const resourceNodeId = `resource-${resource.id}`;
            const resourceNodeExists = allNodes.some(
              (n) => n.id === resourceNodeId,
            );
            if (!resourceNodeExists) {
              allNodes.push({
                id: resourceNodeId,
                type: "resourceNode",
                data: { resource },
                position: {
                  x: 1200,
                  y:
                    policyIndex * 120 +
                    (destinationPeers?.length || 0) * 80 +
                    resourceIndex * 80,
                },
              });
            }

            const resourceEdgeExists = allEdges.some(
              (e) => e.id === `group-resource-${destination.id}-${resource.id}`,
            );
            if (!resourceEdgeExists) {
              allEdges.push({
                id: `group-resource-${destination.id}-${resource.id}`,
                source: destinationNodeId,
                target: resourceNodeId,
                type: "simple",
                data: { enabled },
              });
            }
          });
        }
      });

      // Add destination resource nodes
      addDestinationResourceNodes(policy, allNodes, allEdges);
    });

    return applyD3HierarchicalLayout(allNodes, allEdges, 400, 120, "user", {
      policy: { width: 500, spacing: 60 },
      destinationGroup: { width: 1000, spacing: 100 },
      peersAndResources: { width: 1400, spacing: 80 },
    });
  };

  const fitView = (newNodes?: Node[]) => {
    window.requestAnimationFrame(() =>
      reactFlow.fitView({
        nodes: newNodes ?? nodes,
        padding: 0.1,
        duration: 750,
        maxZoom: 0.8,
        minZoom: DEFAULT_MIN_ZOOM,
      }),
    );
  };

  const handleGroupChange = (id: string) => {
    setNodes((prev) => {
      const shouldRecalculate = selectedGroup !== id;
      shouldRecalculate && setSelectedGroup(id);
      let selectGroupNode;
      const previousNodes = prev.map((node) => {
        if (node.id === `select-group-node`) {
          selectGroupNode = shouldRecalculate
            ? {
                ...node,
                data: {
                  ...node.data,
                  currentGroup: id,
                },
              }
            : node;
          return selectGroupNode;
        }
        return node;
      });
      const result = applySingleGroupView(id);
      if (result && selectGroupNode) {
        let nodesWithCurrentGroup = result.updatedNodes;
        nodesWithCurrentGroup.push(selectGroupNode);
        setEdges(result.updatedEdges);
        setLayoutInitialized(true);
        shouldRecalculate && fitView(nodesWithCurrentGroup);
        return nodesWithCurrentGroup;
      } else {
        return previousNodes;
      }
    });
  };

  const handlePeerChange = (newPeerId: string) => {
    setNodes((prev) => {
      const shouldRecalculate = selectedPeer !== newPeerId;
      shouldRecalculate && setSelectedPeer(newPeerId);

      let selectPeerNode;
      const previousNodes = prev.map((node) => {
        if (node.id === `select-peer-node`) {
          selectPeerNode = shouldRecalculate
            ? {
                ...node,
                data: {
                  ...node.data,
                  currentPeer: newPeerId,
                },
              }
            : node;
          return selectPeerNode;
        }
        return node;
      });
      const result = applyPeerView(newPeerId);
      if (result && selectPeerNode) {
        let nodesWithCurrentPeer = result.updatedNodes;
        nodesWithCurrentPeer.push(selectPeerNode);
        setEdges(result.updatedEdges);
        setLayoutInitialized(true);
        shouldRecalculate && fitView(nodesWithCurrentPeer);
        return nodesWithCurrentPeer;
      } else {
        return previousNodes;
      }
    });
  };

  const handleUserChange = (newUserId: string) => {
    setNodes((prev) => {
      const shouldRecalculate = selectedUser !== newUserId;
      shouldRecalculate && setSelectedUser(newUserId);

      let selectUserNode;
      const previousNodes = prev.map((node) => {
        if (node.id === `select-user-node`) {
          selectUserNode = shouldRecalculate
            ? {
                ...node,
                data: {
                  ...node.data,
                  currentUser: newUserId,
                },
              }
            : node;
          return selectUserNode;
        }
        return node;
      });
      const result = applyUserView(newUserId);
      if (result && selectUserNode) {
        let nodesWithCurrentUser = result.updatedNodes;
        nodesWithCurrentUser.push(selectUserNode);
        setEdges(result.updatedEdges);
        setLayoutInitialized(true);
        shouldRecalculate && fitView(nodesWithCurrentUser);
        return nodesWithCurrentUser;
      } else {
        return previousNodes;
      }
    });
  };

  const forceSingleGroupView = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedNetwork("");
    setCurrentView(FlowView.GROUPS);
    const selectGroupNode = {
      id: `select-group-node`,
      type: "selectGroupNode",
      position: { x: 0, y: 0 },
      data: {
        currentGroup: groupId,
        onChange: handleGroupChange,
      },
    };
    setNodes([selectGroupNode]);
    const result = applySingleGroupView(groupId);
    if (result) {
      let nodesWithCurrentGroup = result.updatedNodes;
      nodesWithCurrentGroup.push(selectGroupNode);
      setEdges(result.updatedEdges);
      setNodes(nodesWithCurrentGroup);
      setLayoutInitialized(true);
      fitView(nodesWithCurrentGroup);
    }
  };

  const forceSingleUserView = (userId: string) => {
    setSelectedPeer("");
    setSelectedUser("");
    setPreviousSelectedUser("");
    setCurrentView(FlowView.USERS);

    const selectUserNode = {
      id: `select-user-node`,
      type: "selectUserNode",
      position: { x: -550, y: 0 },
      data: {
        currentUser: userId,
        onUserChange: handleUserChange,
      },
    };

    setNodes([selectUserNode]);

    const result = applyUserView(userId);
    if (result) {
      let nodesWithUser = result.updatedNodes;
      nodesWithUser.push(selectUserNode);
      setEdges(result.updatedEdges);
      setNodes(nodesWithUser);
      setLayoutInitialized(true);
      fitView(nodesWithUser);
    }
  };

  const forceSinglePeerView = (peerId: string, userId?: string) => {
    setSelectedPeer(peerId);
    setSelectedNetwork("");
    setSelectedUser("");
    setCurrentView(FlowView.PEERS);
    const selectPeerNode = {
      id: `select-peer-node`,
      type: "selectPeerNode",
      position: { x: 0, y: 0 },
      data: {
        currentPeer: peerId,
        onPeerChange: handlePeerChange,
        userId: userId,
        placeholder: "Search peers of user...",
      },
    };
    setNodes([selectPeerNode]);
    const result = applyPeerView(peerId);
    if (result) {
      let nodesWithCurrentPeer = result.updatedNodes;
      nodesWithCurrentPeer.push(selectPeerNode);
      setEdges(result.updatedEdges);
      setNodes(nodesWithCurrentPeer);
      setLayoutInitialized(true);
      fitView(nodesWithCurrentPeer);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (layoutInitialized) return;

    switch (currentView) {
      case FlowView.PEERS:
        if (!peers || peers.length === 0) {
          setEdges([]);
          setNodes([]);
          setLayoutInitialized(true);
          fitView([]);
          return;
        }

        if (selectedPeer === "") {
          const userPeer = peers?.find((p) => p.user_id === loggedInUser?.id);
          const firstPeer = userPeer ?? peers?.[0];
          const initialPeerId = firstPeer?.id ?? "";
          setNodes([
            {
              id: `select-peer-node`,
              type: "selectPeerNode",
              position: { x: 0, y: 0 },
              data: {
                currentPeer: initialPeerId,
                onPeerChange: handlePeerChange,
              },
            },
          ]);
          if (initialPeerId !== "") handlePeerChange(initialPeerId);
        } else {
          resetView();
          handlePeerChange(selectedPeer);
        }

        break;
      case FlowView.USERS:
        if (!users || users.length === 0) {
          setEdges([]);
          setNodes([]);
          setLayoutInitialized(true);
          fitView([]);
          return;
        }

        if (selectedUser === "") {
          let initialUser = users?.find((u) => u.id === loggedInUser?.id);

          if (
            !initialUser ||
            !peers?.some((p) => p.user_id === initialUser?.id)
          ) {
            initialUser = users?.find(
              (u) => peers?.some((p) => p.user_id === u.id),
            );
          }

          if (!initialUser) {
            initialUser = users?.[0];
          }

          const initialUserId = initialUser?.id ?? "";
          setNodes([
            {
              id: `select-user-node`,
              type: "selectUserNode",
              position: { x: -550, y: 0 },
              data: {
                currentUser: initialUserId,
                onUserChange: handleUserChange,
              },
            },
          ]);
          if (initialUserId !== "") handleUserChange(initialUserId);
        } else {
          resetView();
          handleUserChange(selectedUser);
        }

        break;
      case FlowView.GROUPS:
        if (selectedGroup === "") {
          const firstGroup = getFirstGroup(groups, policies);
          const initialGroupId = firstGroup?.id ?? "";
          setNodes([
            {
              id: `select-group-node`,
              type: "selectGroupNode",
              position: { x: 0, y: 0 },
              data: {
                currentGroup: initialGroupId,
                onChange: handleGroupChange,
              },
            },
          ]);
          if (initialGroupId !== "") {
            handleGroupChange(initialGroupId);
          }
        } else {
          resetView();
          handleGroupChange(selectedGroup);
        }
        break;
      case FlowView.NETWORKS:
        if (!networks || networks.length === 0) {
          setEdges([]);
          setNodes([]);
          setLayoutInitialized(true);
          fitView([]);
          return;
        }
        let result;
        if (selectedNetwork) {
          result = applySingleNetworkView(selectedNetwork);
        } else {
          result = applyNetworksView();
        }
        if (result) {
          setEdges(result.updatedEdges);
          setNodes(result.updatedNodes);
          setLayoutInitialized(true);
          fitView(result.updatedNodes);
        }
        break;
      default:
        break;
    }
  }, [
    currentView,
    selectedNetwork,
    selectedPeer,
    selectedGroup,
    selectedUser,
    isLoading,
    layoutInitialized,
  ]);

  const resetView = () => {
    setLayoutInitialized(false);
  };

  const onNetworkSelect = useCallback((networkId: string) => {
    resetView();
    setCurrentView(FlowView.NETWORKS);
    setSelectedNetwork(networkId);
  }, []);

  const onGroupSelect = useCallback((groupId: string) => {
    resetView();
    setCurrentView(FlowView.GROUPS);
    setSelectedGroup(groupId);
  }, []);

  const onViewChange = (view: FlowView) => {
    resetView();
    setSelectedDestinationGroup("");
    setSelectedPeer("");
    setSelectedGroup("");
    setSelectedNetwork("");
    setSelectedUser("");
    setCurrentView(view);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    } catch (e) {}
  };

  const currentNetwork = useMemo(() => {
    return networks?.find((n) => n.id === selectedNetwork);
  }, [networks, selectedNetwork]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      const isNetworkNode = _node.type === "networkNode";
      const isGroupNode =
        _node.type === "groupNode" || _node.type === "sourceGroupNode";
      const isDestinationNode = _node.type === "destinationGroupNode";
      const isPolicyNode = _node.type === "policyNode";

      const networkId = isNetworkNode ? _node.id.replace("network-", "") : "";
      const groupId = isGroupNode ? _node.id.replace("group-", "") : "";
      const destinationGroupId = isDestinationNode
        ? _node.id.replace("group-", "")
        : "";
      const policyId = isPolicyNode ? _node.id.replace("policy-", "") : "";

      if (networkId && currentView === FlowView.NETWORKS) {
        onNetworkSelect(networkId);
      }
      if (
        currentView === FlowView.PEERS ||
        currentView === FlowView.GROUPS ||
        currentView === FlowView.USERS
      ) {
        groupId && onGroupSelect(groupId);
        destinationGroupId && onDestinationGroupSelect(destinationGroupId);
      }
      if (policyId) {
        setSelectedPolicy(policyId);
        setPolicyModalOpen(true);
      }
    },
    [onNetworkSelect, onGroupSelect, onDestinationGroupSelect, currentView],
  );

  const currentPolicy = useMemo(() => {
    return policies?.find((p) => p.id === selectedPolicy);
  }, [policies, selectedPolicy]);

  const handlePolicyChange = () => {
    setTimeout(() => {
      setLayoutInitialized(false);
      setSelectedPolicy("");
      setPolicyModalOpen(false);
    }, 500);
  };

  const { permission } = usePermissions();
  const router = useRouter();

  return (
    <PageContainer>
      {currentPolicy && (
        <AccessControlUpdateModal
          policy={currentPolicy}
          open={policyModalOpen}
          onSuccess={handlePolicyChange}
          onOpenChange={setPolicyModalOpen}
        />
      )}
      <div style={{ width: "100%", height: "100%" }} className={"relative"}>
        {currentView === FlowView.PEERS &&
          !isPeersLoading &&
          peers?.length === 0 && (
            <div className={"absolute left-0 top-0 w-full mt-20"}>
              <NoPeersGettingStarted showBackground={false} />
            </div>
          )}

        {currentView === FlowView.NETWORKS &&
          !isNetworksLoading &&
          networks?.length === 0 && (
            <div className={"absolute left-0 top-0 w-full mt-20"}>
              <GetStartedTest
                showBackground={false}
                icon={
                  <SquareIcon
                    icon={
                      <NetworkRoutesIcon
                        className={"fill-nb-gray-200"}
                        size={20}
                      />
                    }
                    color={"gray"}
                    size={"large"}
                  />
                }
                title={"Create New Network"}
                description={
                  "It looks like you don't have any networks. Access internal resources in your LANs and VPC by adding a network."
                }
                button={
                  <div className={"gap-x-4 flex items-center justify-center"}>
                    <Button
                      variant={"primary"}
                      onClick={() => router.push("/networks")}
                      disabled={!permission.networks.create}
                    >
                      Go to Networks
                    </Button>
                  </div>
                }
                learnMore={
                  <>
                    Learn more about
                    <InlineLink
                      href={"https://docs.netbird.io/how-to/networks"}
                      target={"_blank"}
                    >
                      Networks
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
                  </>
                }
              />
            </div>
          )}

        <div className={"absolute left-0 top-0 z-10"}>
          <div className={"flex justify-between px-6 py-4 text-sm w-full"}>
            <div className={"flex gap-4"}>
              {selectedNetwork !== "" && (
                <Button
                  variant={"secondary"}
                  size={"xs"}
                  className={"!bg-nb-gray-930"}
                  onClick={() => onNetworkSelect("")}
                >
                  <ArrowLeftIcon size={14} />
                </Button>
              )}

              {previousSelectedUser !== "" && (
                <>
                  <Button
                    variant={"secondary"}
                    size={"xs"}
                    className={"!bg-nb-gray-930"}
                    onClick={() => {
                      forceSingleUserView(previousSelectedUser);
                    }}
                  >
                    <ArrowLeftIcon size={14} />
                  </Button>
                  <ControlCenterCurrentUserBadge
                    userId={previousSelectedUser}
                  />
                </>
              )}

              {selectedNetwork === "" && previousSelectedUser === "" && (
                <FlowSelector value={currentView} onChange={onViewChange} />
              )}

              {currentView === "networks" && (
                <div className={"w-64"}>
                  <SelectDropdown
                    variant={"secondary"}
                    value={selectedNetwork}
                    onChange={onNetworkSelect}
                    options={networkOptions}
                    showSearch={true}
                    className={
                      "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300"
                    }
                    size={"xs"}
                  />
                </div>
              )}

              {selectedNetwork && currentNetwork && (
                <NetworkRoutingPeerCount network={currentNetwork} />
              )}
            </div>
          </div>
        </div>

        <div className={"absolute right-0 top-0 z-10"}>
          <div className={"px-6 py-4"}>
            <SmallBadge
              text={"Beta"}
              variant={"sky"}
              className={"text-[12px] leading-none py-[3px] px-[6px]"}
              textClassName={"top-0"}
            />
          </div>
        </div>

        <div className={"absolute right-0 bottom-0 z-10"}>
          <div className={"px-6 py-4"}>
            <a href={"https://forms.gle/MKJnVXCiUM1KtxLy6"} target={"_blank"}>
              <Button variant={"secondary"} size={"xs"}>
                <MessageSquareShareIcon size={12} />
                Feedback
              </Button>
            </a>
          </div>
        </div>

        <PeersProvider>
          <ReactFlow
            edges={edges}
            nodes={nodes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            proOptions={{
              hideAttribution: true,
            }}
            onNodeClick={onNodeClick}
            nodeTypes={NODE_TYPES as unknown as NodeTypes} // TODO fix type
            edgeTypes={EDGE_TYPES as unknown as EdgeTypes} // TODO fix type
            fitView={false}
            maxZoom={DEFAULT_MAX_ZOOM}
            minZoom={DEFAULT_MIN_ZOOM}
            colorMode={"dark"}
          >
            <Background bgColor={"#181a1d"} gap={20} color={"#717171"} />
          </ReactFlow>
        </PeersProvider>
      </div>
    </PageContainer>
  );
}

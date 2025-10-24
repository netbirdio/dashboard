"use client";

import "@xyflow/react/dist/style.css";
import Button from "@components/Button";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import {
  Background,
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
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
import PeersProvider from "@/contexts/PeersProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import PageContainer from "@/layouts/PageContainer";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { AccessControlUpdateModal } from "@/modules/access-control/AccessControlModal";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import GetStartedTest from "@components/ui/GetStartedTest";
import SquareIcon from "@components/SquareIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import InlineLink from "@components/InlineLink";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { SmallBadge } from "@components/ui/SmallBadge";

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
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const reactFlow = useReactFlow();
  const [layoutInitialized, setLayoutInitialized] = useState(false);
  const [forceLayoutChange, setForceLayoutChange] = useState(false);
  const { loggedInUser } = useLoggedInUser();

  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const initialTab = useMemo(() => {
    if (queryTab === "peers") return FlowView.PEERS;
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

  const isLoading =
    isPoliciesLoading ||
    isPeersLoading ||
    isNetworksLoading ||
    isResourcesLoading ||
    isGroupsLoading;

  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("");
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
      setLayoutInitialized(false);
      if (selectedDestinationGroup == groupId) {
        setSelectedDestinationGroup("");
      } else {
        setSelectedDestinationGroup(groupId);
      }
    },
    [selectedDestinationGroup],
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
              enabled,
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
                  data: { peer, enabled },
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
                  data: { resource, enabled },
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
    if (layoutInitialized) return;

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
              enabled,
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
    });

    return applyD3HierarchicalLayout(allNodes, allEdges, 400, 120, "peer", {
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
        maxZoom: DEFAULT_MAX_ZOOM,
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

  useEffect(() => {
    if (isLoading) return;
    if (layoutInitialized) return;

    switch (currentView) {
      case FlowView.PEERS:
        if (peers?.length === 0) {
          setEdges([]);
          setNodes([]);
          setLayoutInitialized(true);
          fitView([]);
          return;
        }

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
        if (networks?.length === 0) {
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
      if (currentView === FlowView.PEERS || currentView === FlowView.GROUPS) {
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
              {selectedNetwork === "" && (
                <FlowSelector value={currentView} onChange={onViewChange} />
              )}

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

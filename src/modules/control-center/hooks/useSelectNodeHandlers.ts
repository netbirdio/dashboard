import { Node, useReactFlow } from "@xyflow/react";
import React, { useCallback, useEffect } from "react";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { DEFAULT_MIN_ZOOM, EMPTY_STATE_ZOOM } from "@/modules/control-center/utils/layouts";
import { getFirstGroup } from "@/modules/control-center/utils/helpers";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

interface UseSelectNodeHandlersParams {
  views: {
    applySingleGroupView: (id: string) => any;
    applyPeerView: (id: string) => any;
    applyUserView: (id: string) => any;
    applySingleNetworkView: (id: string) => any;
    applyNetworksView: () => any;
  };
}

interface EntityChangeConfig {
  selectNodeId: string;
  dataKey: string;
  selectedValue: string;
  setSelected: (v: string) => void;
  applyView: (id: string) => any;
}

interface ForceEntityViewConfig {
  flowView: FlowView;
  resetState: () => void;
  selectNode: Node;
  applyView: (id: string) => any;
}

export function useSelectNodeHandlers(params: UseSelectNodeHandlersParams) {
  const reactFlow = useReactFlow();

  const {
    nodes,
    setNodes,
    setEdges,
    layoutInitialized,
    setLayoutInitialized,
    currentView,
    setCurrentView,
    selectedNetwork,
    setSelectedNetwork,
    selectedGroup,
    setSelectedGroup,
    selectedPeer,
    setSelectedPeer,
    selectedUser,
    setSelectedUser,
    setPreviousSelectedUser,
    setSelectedDestinationGroup,
    selectedDestinationGroup,
    loggedInUser,
  } = useCanvasState();

  const {
    policies,
    peers,
    networks,
    groups,
    users,
    networkResources,
    isLoading,
  } = useControlCenterData();

  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const { isDraft } = useDraftMode();

  const {
    views: {
      applySingleGroupView,
      applyPeerView,
      applyUserView,
      applySingleNetworkView,
      applyNetworksView,
    },
  } = params;

  // ---------------------------------------------------------------------------
  // fitView
  // ---------------------------------------------------------------------------

  const fitView = (newNodes?: Node[]) => {
    const target = newNodes ?? nodes;
    window.requestAnimationFrame(() => {
      if (target.length === 0) {
        reactFlow.setViewport({ x: 0, y: 0, zoom: EMPTY_STATE_ZOOM });
        return;
      }
      reactFlow.fitView({
        nodes: target,
        padding: 0.1,
        duration: 750,
        maxZoom: 0.8,
        minZoom: DEFAULT_MIN_ZOOM,
      });
    });
  };

  // ---------------------------------------------------------------------------
  // Generic handleEntityChange
  // ---------------------------------------------------------------------------

  const handleEntityChange = (id: string, config: EntityChangeConfig) => {
    const { selectNodeId, dataKey, selectedValue, setSelected, applyView } =
      config;

    setNodes((prev) => {
      const shouldRecalculate = selectedValue !== id;
      shouldRecalculate && setSelected(id);

      let selectNode: Node | undefined;
      const previousNodes = prev.map((node) => {
        if (node.id === selectNodeId) {
          selectNode = shouldRecalculate
            ? { ...node, data: { ...node.data, [dataKey]: id } }
            : node;
          return selectNode;
        }
        return node;
      });

      const result = applyView(id);
      if (result && selectNode) {
        const updatedNodes = result.updatedNodes;
        updatedNodes.push(selectNode);
        setEdges(result.updatedEdges);
        setLayoutInitialized(true);
        shouldRecalculate && fitView(updatedNodes);
        return updatedNodes;
      }
      return previousNodes;
    });
  };

  const handleGroupChange = (id: string) =>
    handleEntityChange(id, {
      selectNodeId: "select-group-node",
      dataKey: "currentGroup",
      selectedValue: selectedGroup,
      setSelected: setSelectedGroup,
      applyView: applySingleGroupView,
    });

  const handlePeerChange = (newPeerId: string) =>
    handleEntityChange(newPeerId, {
      selectNodeId: "select-peer-node",
      dataKey: "currentPeer",
      selectedValue: selectedPeer,
      setSelected: setSelectedPeer,
      applyView: applyPeerView,
    });

  const handleUserChange = (newUserId: string) =>
    handleEntityChange(newUserId, {
      selectNodeId: "select-user-node",
      dataKey: "currentUser",
      selectedValue: selectedUser,
      setSelected: setSelectedUser,
      applyView: applyUserView,
    });

  // ---------------------------------------------------------------------------
  // Generic forceEntityView
  // ---------------------------------------------------------------------------

  const forceEntityView = (entityId: string, config: ForceEntityViewConfig) => {
    const { flowView, resetState, selectNode, applyView } = config;

    resetState();
    setCurrentView(flowView);
    setNodes([selectNode]);

    const result = applyView(entityId);
    if (result) {
      const updatedNodes = result.updatedNodes;
      updatedNodes.push(selectNode);
      setEdges(result.updatedEdges);
      setNodes(updatedNodes);
      setLayoutInitialized(true);
      fitView(updatedNodes);
    }
  };

  const forceSingleGroupView = (groupId: string) =>
    forceEntityView(groupId, {
      flowView: FlowView.GROUPS,
      resetState: () => {
        setSelectedGroup(groupId);
        setSelectedNetwork("");
      },
      selectNode: {
        id: "select-group-node",
        type: "selectGroupNode",
        position: { x: 0, y: 0 },
        data: {
          currentGroup: groupId,
          onChange: handleGroupChange,
        },
      },
      applyView: applySingleGroupView,
    });

  const forceSingleUserView = (userId: string) =>
    forceEntityView(userId, {
      flowView: FlowView.USERS,
      resetState: () => {
        setSelectedPeer("");
        setSelectedUser("");
        setPreviousSelectedUser("");
      },
      selectNode: {
        id: "select-user-node",
        type: "selectUserNode",
        position: { x: -550, y: 0 },
        data: {
          currentUser: userId,
          onUserChange: handleUserChange,
        },
      },
      applyView: applyUserView,
    });

  const forceSinglePeerView = (peerId: string, userId?: string) =>
    forceEntityView(peerId, {
      flowView: FlowView.PEERS,
      resetState: () => {
        setSelectedPeer(peerId);
        setSelectedNetwork("");
        setSelectedUser("");
      },
      selectNode: {
        id: "select-peer-node",
        type: "selectPeerNode",
        position: { x: 0, y: 0 },
        data: {
          currentPeer: peerId,
          onPeerChange: handlePeerChange,
          userId,
          placeholder: "Search peers of user...",
        },
      },
      applyView: applyPeerView,
    });

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // onDestinationGroupSelect
  // ---------------------------------------------------------------------------

  const onDestinationGroupSelect = useCallback(
    (groupId: string) => {
      setSelectedDestinationGroup(
        selectedDestinationGroup === groupId ? "" : groupId,
      );
    },
    [selectedDestinationGroup, setSelectedDestinationGroup],
  );

  // ---------------------------------------------------------------------------
  // onNodeClick
  // ---------------------------------------------------------------------------

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      const isNetworkNode = _node.type === "networkNode";
      const isGroupNode =
        _node.type === "groupNode" ||
        _node.type === "sourceGroupNode" ||
        _node.type === "destinationGroupNode";
      const isPolicyNode = _node.type === "policyNode";

      const networkId = isNetworkNode ? _node.id.replace("network-", "") : "";
      const groupId = isGroupNode
        ? (_node.data as any)?.group?.id || _node.id.replace("group-", "")
        : "";
      const policyId = isPolicyNode ? _node.id.replace("policy-", "") : "";

      if (networkId && currentView === FlowView.NETWORKS) {
        onNetworkSelect(networkId);
      }
      if (
        groupId &&
        (currentView === FlowView.PEERS ||
          currentView === FlowView.GROUPS ||
          currentView === FlowView.USERS)
      ) {
        onDestinationGroupSelect(groupId);
      }
      if (policyId) {
        setSelectedPolicy(policyId);
        setPolicyModalOpen(true);
      }
    },
    [onNetworkSelect, onDestinationGroupSelect, currentView],
  );

  // ---------------------------------------------------------------------------
  // View initialization effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isLoading) return;
    // Draft mode manages its own canvas (useDraft); don't let the live view
    // initialization run/fitView while drafting.
    if (isDraft) return;
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
              id: "select-peer-node",
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
          if (!initialUser) initialUser = users?.[0];
          const initialUserId = initialUser?.id ?? "";
          setNodes([
            {
              id: "select-user-node",
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
              id: "select-group-node",
              type: "selectGroupNode",
              position: { x: 0, y: 0 },
              data: {
                currentGroup: initialGroupId,
                onChange: handleGroupChange,
              },
            },
          ]);
          if (initialGroupId !== "") handleGroupChange(initialGroupId);
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
    }
  }, [
    currentView,
    selectedNetwork,
    selectedPeer,
    selectedGroup,
    selectedUser,
    isLoading,
    layoutInitialized,
    isDraft,
  ]);

  return {
    fitView,
    handleGroupChange,
    handlePeerChange,
    handleUserChange,
    forceSingleGroupView,
    forceSingleUserView,
    forceSinglePeerView,
    onDestinationGroupSelect,
    onNetworkSelect,
    onViewChange,
    onNodeClick,
  };
}

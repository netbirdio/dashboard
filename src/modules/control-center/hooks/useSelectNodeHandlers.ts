import { Node, Rect, useReactFlow } from "@xyflow/react";
import {
  drillInto,
  drillOutOf,
  getNodeRect,
  isCanvasTransitionActive,
} from "@/modules/control-center/utils/canvas-transition";
import React, { useCallback, useEffect } from "react";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { DEFAULT_MIN_ZOOM, EMPTY_STATE_ZOOM } from "@/modules/control-center/utils/layouts";
import {
  getFirstGroup,
  getPlaceholderPeer,
  isFocusWorthy,
} from "@/modules/control-center/utils/helpers";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDestinationGroup } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { Policy } from "@/interfaces/Policy";
import { useDialog } from "@/contexts/DialogProvider";

interface UseSelectNodeHandlersParams {
  views: {
    applySingleGroupView: (id: string, policiesOverride?: Policy[]) => any;
    applyPeerView: (id: string, policiesOverride?: Policy[]) => any;
    applyUserView: (id: string, policiesOverride?: Policy[]) => any;
    applySingleNetworkView: (id: string, policiesOverride?: Policy[]) => any;
    applyNetworksView: (policiesOverride?: Policy[]) => any;
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
    setSelectedDestinationGroup,
    selectedDestinationGroup,
    setLiveResourceEditor,
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

  const {
    setFocusedNodeId,
    highlightArmed,
    setHighlightArmed,
    setSelectedPeerPanel,
  } = useDestinationGroup();
  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const { isDraft } = useDraftMode();
  const { confirm } = useDialog();

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

  // First fit after a mount: returning to the page via client-side nav
  // remounts with a warm SWR cache, so nodes commit (and paint at the
  // default viewport — a top-left flash) before the camera is fitted. Hide
  // the viewport (cc-prefit, applied synchronously so it lands in the same
  // paint as the nodes) and fit WITHOUT animation, revealing the scene
  // already framed.
  const firstFitRef = React.useRef(true);

  const fitView = (newNodes?: Node[]) => {
    // A running canvas transition owns the camera — its reveal does the fit.
    if (isCanvasTransitionActive()) return;
    const target = newNodes ?? nodes;
    const isFirstFit = firstFitRef.current;
    firstFitRef.current = false;
    const flowEl = isFirstFit
      ? document.querySelector<HTMLElement>(".react-flow")
      : null;
    flowEl?.classList.add("cc-prefit");
    const reveal = () => flowEl?.classList.remove("cc-prefit");
    // The view can initialize before ReactFlow has rendered/measured the new
    // nodes (warm-cache remount) — fitView would then compute bounds from
    // unmeasured nodes and misalign the camera. Wait (bounded) until every
    // target node is in the store with a measured size.
    const attempt = (triesLeft: number) => {
      if (target.length === 0) {
        // Center the flow origin mid-screen (a raw {0,0} viewport anchors it
        // at the top-left corner, making the next view's fit animation fly in
        // from far away).
        void reactFlow.setCenter(0, 0, { zoom: EMPTY_STATE_ZOOM });
        reveal();
        return;
      }
      const stored = new Map(reactFlow.getNodes().map((n) => [n.id, n]));
      const allMeasured = target.every((n) => {
        const s = stored.get(n.id);
        if (!s) return false;
        // Style-sized nodes (network frames) don't need to wait for the
        // ResizeObserver — their geometry is already known.
        if (Number(s.style?.width) > 0 && Number(s.style?.height) > 0) {
          return true;
        }
        return (s.measured?.width ?? 0) > 0;
      });
      if (!allMeasured && triesLeft > 0) {
        window.requestAnimationFrame(() => attempt(triesLeft - 1));
        return;
      }
      void reactFlow
        .fitView({
          nodes: target,
          padding: 0.1,
          // The first fit reveals a hidden scene — snap, don't animate.
          duration: isFirstFit ? 0 : 800,
          // Gentle ease-OUT (quad): starts moving on the first frame — the
          // default ease-in-out barely moves for the first ~150ms, which reads
          // as a stall — but decelerates softly instead of snapping.
          ease: (t: number) => t * (2 - t),
          maxZoom: 0.8,
          minZoom: DEFAULT_MIN_ZOOM,
        })
        .then(reveal, reveal);
    };
    window.requestAnimationFrame(() => attempt(30));
  };

  // ---------------------------------------------------------------------------
  // Generic handleEntityChange
  // ---------------------------------------------------------------------------

  const handleEntityChange = (id: string, config: EntityChangeConfig) => {
    const { selectNodeId, dataKey, selectedValue, setSelected, applyView } =
      config;
    const shouldRecalculate = selectedValue !== id;

    // Compute the view layout ONCE, before touching state — it's a synchronous
    // d3 simulation and must not run inside the setNodes updater (React
    // double-invokes updaters under StrictMode/concurrent rendering, which ran
    // the layout twice). applyView is a pure function of the SWR data + id; it
    // does not read the canvas store, so hoisting it out is safe.
    const result = applyView(id);

    if (shouldRecalculate) setSelected(id);

    if (result) {
      // The select node may have just been set by the caller (the view-init
      // effect does setNodes([selectNode]) immediately before this) and not
      // yet be committed — so read/patch it from the updater's `prev`, NOT
      // reactFlow.getNodes(), which wouldn't see it yet. The updater stays
      // pure (no side effects): it only derives the next nodes from prev.
      setNodes((prev) => {
        const source = prev.find((n) => n.id === selectNodeId);
        if (!source) return prev;
        const selectNode = shouldRecalculate
          ? { ...source, data: { ...source.data, [dataKey]: id } }
          : source;
        return [...result.updatedNodes, selectNode];
      });
      setEdges(result.updatedEdges);
      setLayoutInitialized(true);
      // fitView only needs the node ids to fit — it reads their geometry from
      // the store at rAF time — so a stub id for the select node is enough.
      if (shouldRecalculate)
        fitView([...result.updatedNodes, { id: selectNodeId } as Node]);
      return;
    }

    // No view result — just stamp the select node's data key.
    if (shouldRecalculate) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selectNodeId
            ? { ...n, data: { ...n.data, [dataKey]: id } }
            : n,
        ),
      );
    }
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
  // refreshLiveView — in-place canvas update after a live policy save
  // ---------------------------------------------------------------------------

  // Rebuilds the CURRENT live view from the API response of a policy update
  // (the SWR cache still holds the pre-save list until its background
  // revalidation lands). Surviving nodes keep their positions and the camera
  // stays put — no layoutInitialized reset, no fitView; added/removed
  // sources, destinations and edges reconcile through the rebuild itself.
  const refreshLiveView = (updatedPolicy: Policy) => {
    if (isDraft || !policies) return;
    const patched = policies.map((p) =>
      p.id === updatedPolicy.id ? updatedPolicy : p,
    );

    let result;
    switch (currentView) {
      case FlowView.GROUPS:
        if (selectedGroup) result = applySingleGroupView(selectedGroup, patched);
        break;
      case FlowView.PEERS:
        if (selectedPeer) result = applyPeerView(selectedPeer, patched);
        break;
      case FlowView.USERS:
        if (selectedUser) result = applyUserView(selectedUser, patched);
        break;
      case FlowView.NETWORKS:
        result = selectedNetwork
          ? applySingleNetworkView(selectedNetwork, patched)
          : applyNetworksView(patched);
        break;
    }
    if (!result) return;

    setNodes((prev) => {
      // Keep positions of nodes the user already sees (only top-level ones —
      // frame children stay frame-relative); brand-new nodes take their
      // layout positions.
      const prevPositions = new Map(
        prev.filter((n) => !n.parentId).map((n) => [n.id, n.position]),
      );
      const merged = (result.updatedNodes as Node[]).map((n) => {
        const position = !n.parentId ? prevPositions.get(n.id) : undefined;
        return position ? { ...n, position } : n;
      });
      // The select node isn't part of view results — carry it over.
      const selects = prev.filter((n) => n.id.startsWith("select-"));
      return [...merged, ...selects];
    });
    setEdges(result.updatedEdges);
  };

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

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const resetView = () => {
    setLayoutInitialized(false);
  };

  // Selecting a network plays the shared canvas transition: dive IN toward
  // the clicked frame (or a plain zoom-in for dropdown picks, where there's
  // no rect), fly OUT when going back to the overview. The view rebuild
  // happens in the invisible swap window; the transition's reveal owns the
  // camera (the init effect's fitView is suppressed meanwhile).
  const onNetworkSelect = useCallback(
    (networkId: string, targetRect?: Rect | null) => {
      const swap = () => {
        resetView();
        setCurrentView(FlowView.NETWORKS);
        setSelectedNetwork(networkId);
      };
      if (networkId) drillInto(reactFlow, targetRect, swap);
      else drillOutOf(reactFlow, swap);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  // Clicking a group opens its panel; clicking it again keeps it open (no
  // toggle) — the panel only closes on a click outside (pane click / Esc).
  const onDestinationGroupSelect = useCallback(
    (groupId: string) => {
      // Focus Mode is sticky — opening a group's panel while focused keeps
      // the focus (the dim stays keyed on the focused node). One panel at a
      // time: the group panel supersedes the peer panel.
      setSelectedPeerPanel("");
      setSelectedDestinationGroup(groupId);
    },
    [setSelectedDestinationGroup, setSelectedPeerPanel],
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

      // A live frame's resource row drills into its network, same as the
      // frame itself (rows are separate nodes, so the frame click never
      // fires for them).
      // A live frame's resource / resource-group row drills into its network,
      // same as the frame. Only in the overview (!selectedNetwork) — inside the
      // drilled view these rows are already there, so a click is a no-op.
      const frameChildNetworkId =
        !isDraft &&
        !selectedNetwork &&
        (_node.type === "resourceNode" || _node.type === "resourceGroupNode") &&
        _node.parentId?.startsWith("network-")
          ? _node.parentId.replace("network-", "")
          : "";
      const networkId = isNetworkNode
        ? _node.id.replace("network-", "")
        : frameChildNetworkId;
      // Draft groups have no API id yet — the panel is keyed by node id then.
      const groupId = isGroupNode
        ? (_node.data as any)?.group?.id || (isDraft ? _node.id : _node.id.replace("group-", ""))
        : "";
      // Inline policy pills (all-networks view) use per-network node ids
      // ("policy-<pid>-net-<nid>") — the data carries the real policy id.
      const policyId = isPolicyNode
        ? (_node.data as any)?.policy?.id ?? _node.id.replace("policy-", "")
        : "";

      // Focus Mode armed: the click PICKS the focus target instead of its
      // normal action, then picking disarms — the focus is sticky (clicking
      // around doesn't re-target; Esc / the pill's X / the header button
      // exit). A node with no edges has no path to trace, so it's ignored
      // and the mode stays armed.
      if (highlightArmed) {
        // The view's selector nodes (pick a peer/group/user) aren't real
        // entities — they can't be focused.
        if (
          _node.type === "selectPeerNode" ||
          _node.type === "selectGroupNode" ||
          _node.type === "selectUserNode"
        ) {
          return;
        }
        // Only busy nodes are worth focusing (4+ edges, 2+ policies).
        if (
          !isFocusWorthy(_node.id, reactFlow.getNodes(), reactFlow.getEdges())
        ) {
          return;
        }
        // One focus at a time — the highlight supersedes a group focus.
        setSelectedDestinationGroup("");
        setFocusedNodeId(_node.id);
        setHighlightArmed(false);
        return;
      }

      // Draft network clicks are handled by the node itself (frame
      // drill-down) — selecting a live network view there would leak a
      // draft-only id into the live selection.
      if (networkId && currentView === FlowView.NETWORKS && !isDraft) {
        // The dive-in targets the clicked frame (a resource row resolves to
        // its parent frame).
        const frame = reactFlow
          .getNodes()
          .find((n) => n.id === `network-${networkId}`);
        onNetworkSelect(networkId, getNodeRect(frame));
      }
      if (groupId) {
        // Every view (live networks included): clicking a group opens its
        // side panel — the focus-dim effect highlights its path.
        onDestinationGroupSelect(groupId);
      }
      // Clicking a policy opens the editor directly (live and draft alike). In
      // live the "you are in live mode" confirmation is deferred to when the
      // user clicks Save Changes (onBeforeSave in ControlCenterPolicyModals).
      if (policyId) {
        setSelectedPolicy(policyId);
        setPolicyModalOpen(true);
      }
      // Live resources open the real editor (networks page modal) — its
      // save PUTs, so confirm first, like the live policy actions. Framed
      // overview rows keep drilling into their network instead.
      const isResourceNode =
        _node.type === "resourceNode" ||
        _node.type === "destinationResourceNode";
      if (!isDraft && isResourceNode && !frameChildNetworkId) {
        const resource = (_node.data as { resource?: { id?: string; name?: string } })
          ?.resource;
        const resNetworkId =
          (_node.data as { draftNetwork?: { networkId?: string } })
            ?.draftNetwork?.networkId ??
          _node.parentId?.replace("network-", "");
        if (resource?.id && resNetworkId) {
          void (async () => {
            const choice = await confirm({
              title: `Edit resource “${resource.name ?? "Resource"}”?`,
              description:
                "You are in live mode. Saving your changes will apply them to your account immediately.",
              confirmText: "Edit",
              cancelText: "Cancel",
              type: "warning",
              dismissOnOutsideClick: true,
            });
            if (!choice) return;
            setLiveResourceEditor({
              resourceId: resource.id!,
              networkId: resNetworkId,
            });
          })();
        }
      }
      // Clicking a peer opens its groups panel (the peer-side twin of the
      // group panel) — placeholders included: their assignments become the
      // setup key's auto-assigned groups and deploy once the peer installs.
      const isPeerNode =
        _node.type === "peerNode" ||
        _node.type === "sourcePeerNode" ||
        _node.type === "expandedGroupPeer";
      const peerId =
        (_node.data as { peer?: { id?: string } })?.peer?.id ??
        getPlaceholderPeer(_node)?.id;
      if (isPeerNode && peerId) {
        setSelectedDestinationGroup("");
        setSelectedPeerPanel(peerId);
      }
    },
    [
      onNetworkSelect,
      onDestinationGroupSelect,
      currentView,
      selectedNetwork,
      isDraft,
      setFocusedNodeId,
      highlightArmed,
      setHighlightArmed,
      setSelectedPolicy,
      setPolicyModalOpen,
      setSelectedPeerPanel,
      setLiveResourceEditor,
      confirm,
    ],
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
    onDestinationGroupSelect,
    onNetworkSelect,
    refreshLiveView,
    onViewChange,
    onNodeClick,
  };
}

"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  EdgeTypes,
  type Edge as FlowEdge,
  type Node as FlowNode,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from "@xyflow/react";
import React, { useState } from "react";
import PeersProvider from "@/contexts/PeersProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import PageContainer from "@/layouts/PageContainer";
import { EDGE_TYPES } from "@/modules/control-center/utils/edges";
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  EMPTY_STATE_ZOOM,
} from "@/modules/control-center/utils/layouts";
import { NODE_TYPES } from "@/modules/control-center/utils/nodes";
import { DragAndDropProvider } from "@/modules/control-center/DragAndDropProvider";
import { ConnectionLine } from "@/modules/control-center/ConnectionLine";
import { ControlCenterComponentsPanel } from "@/modules/control-center/draft/ControlCenterComponentsPanel";
import {
  DraftModeProvider,
  useDraftMode,
  useNetworkHover,
} from "@/modules/control-center/draft/DraftModeContext";
import { CanvasContextMenu } from "@/modules/control-center/CanvasContextMenu";
import { NodeContextMenu } from "@/modules/control-center/NodeContextMenu";
import { PeersToolbar } from "@/modules/control-center/draft/PeersToolbar";
import { DraftInstallPeerModal } from "@/modules/control-center/draft/DraftInstallPeerModal";
import { DraftUserDeviceModal } from "@/modules/control-center/draft/DraftUserDeviceModal";
import { DraftResourceEditorModal } from "@/modules/control-center/draft/DraftResourceEditorModal";
import { DraftResourceNetworkModal } from "@/modules/control-center/draft/DraftResourceNetworkModal";
import { DraftNetworkDestinationModal } from "@/modules/control-center/draft/DraftNetworkDestinationModal";
import { DraftNetworkEditModal } from "@/modules/control-center/draft/DraftNetworkEditModal";
import { DraftRoutingPeerModal } from "@/modules/control-center/draft/DraftRoutingPeerModal";
import { DraftLeaveGuard } from "@/modules/control-center/draft/DraftLeaveGuard";
import { useDraft } from "@/modules/control-center/hooks/useDraft";
import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";
import { ControlCenterHeader } from "@/modules/control-center/ControlCenterHeader";
import { ControlCenterEmptyStates } from "@/modules/control-center/ControlCenterEmptyStates";
import {
  CanvasStateProvider,
  ControlCenterUIProvider,
  useCanvasState,
  useControlCenterUI,
  useDestinationGroup,
} from "@/modules/control-center/ControlCenterContext";
import { groupPanelCloseGuard } from "@/modules/control-center/DestinationGroupPanel";
import { ControlCenterPolicyProvider } from "@/modules/control-center/ControlCenterPolicyModals";
import { DraftChangesetProvider } from "@/modules/control-center/draft/DraftChangesetContext";
import { DraftHistoryProvider } from "@/modules/control-center/draft/DraftHistoryContext";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import { useDrillDownBrowserHistory } from "@/modules/control-center/hooks/useDrillDownBrowserHistory";
import { useGroupFocusDim } from "@/modules/control-center/hooks/useGroupFocusDim";
import { isFrameNode } from "@/modules/control-center/utils/helpers";
import GroupsProvider from "@/contexts/GroupsProvider";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import { Network } from "@/interfaces/Network";
import { useSWRConfig } from "swr";

export default function ControlCenter() {
  return (
    <DraftModeProvider>
      <DragAndDropProvider>
        <ReactFlowProvider>
          <PoliciesProvider>
            <PeersProvider>
              <CanvasStateProvider>
                <GroupsProvider>
                <DraftChangesetProvider>
                  <DraftHistoryProvider>
                  <ControlCenterPolicyProvider>
                  <PageContainer>
                    <ControlCenterUIProvider
                      sidebar={<ControlCenterComponentsPanel />}
                    >
                      <ControlCenterCanvas />
                    </ControlCenterUIProvider>
                  </PageContainer>
                  </ControlCenterPolicyProvider>
                  </DraftHistoryProvider>
                </DraftChangesetProvider>
                </GroupsProvider>
              </CanvasStateProvider>
            </PeersProvider>
          </PoliciesProvider>
        </ReactFlowProvider>
      </DragAndDropProvider>
    </DraftModeProvider>
  );
}

const PRO_OPTIONS = { hideAttribution: true };
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: EMPTY_STATE_ZOOM };

function ControlCenterCanvas() {
  const canvas = useCanvasState();
  const ui = useControlCenterUI();
  const draft = useDraft();
  const { componentsPanelOpen, setComponentsPanelOpen } = useDraftMode();
  // In focus mode dragging is disabled, so a drag pans the canvas rather than
  // nudging a dimmed node.
  const { focusedNodeId, highlightArmed, setSelectedPeerPanel } =
    useDestinationGroup();
  const focusMode = focusedNodeId !== "";
  const { setHoveredNetworkNodeId } = useNetworkHover();
  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useDragToGroup();
  useDrillDownBrowserHistory();
  useGroupFocusDim();

  const { mutate } = useSWRConfig();
  const onLiveNetworkCreated = React.useCallback(
    async (network: Network) => {
      // Drill only after /networks includes the new one — the single-network
      // view builds from the revalidated list.
      await mutate("/networks");
      ui.onNetworkSelect(network.id);
    },
    [mutate, ui],
  );

  // GraphView's memo only bails when every other prop keeps identity; per-render
  // callbacks would re-render the whole canvas each drag tick, so route handlers
  // through a stable wrapper.
  const useStableHandler = <A extends unknown[], R>(
    fn: (...args: A) => R,
  ): ((...args: A) => R) => {
    const ref = React.useRef(fn);
    ref.current = fn;
    return React.useCallback((...args: A) => ref.current(...args), []);
  };

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [nodeContextMenuPos, setNodeContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const nodeContextMenuOpen = nodeContextMenuPos !== null;
  const anyMenuOpen = contextMenuOpen || nodeContextMenuOpen;
  // While an empty-state overlay is up (live empty views or the draft start
  // screen), lock canvas interactions. A blank draft has no overlay, so it
  // stays interactive.
  const emptyState =
    canvas.nodes.length === 0 &&
    !componentsPanelOpen &&
    !(draft.isDraft && draft.startedBlank);
  const canInteract = !anyMenuOpen && !draft.isSelectMode && !emptyState;

  // Close only the menu (not panels), so picking e.g. "Details" keeps the
  // panel it just opened.
  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
  }, [canvas, setSelectedPeerPanel]);

  // Outside click dismisses everything at once (menu + panels + components
  // picker). The group panel may register a discard-confirm guard, so wait on
  // it before closing.
  const dismissCanvasOverlays = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
    setComponentsPanelOpen(false);
    // Focus Mode intentionally SURVIVES pane clicks — it only exits via the
    // pill's X or Escape (FocusModeButton).
    const guard = groupPanelCloseGuard.current;
    const closeGroupPanel = () => {
      canvas.setSelectedDestinationGroup("");
      setSelectedPeerPanel("");
    };
    if (guard) {
      void guard().then((ok) => ok && closeGroupPanel());
    } else {
      closeGroupPanel();
    }
  }, [canvas, setSelectedPeerPanel]);

  const stableOnConnect = useStableHandler(draft.onNodeConnect);
  const stableOnNodeClick = useStableHandler(ui.onNodeClick);
  const stableOnNodeContextMenu = useStableHandler(
    (event: React.MouseEvent, node: FlowNode) => {
      // Live mode shows our menu only for these node types; every other node
      // keeps the browser's default menu.
      const LIVE_MENU_TYPES = new Set([
        "policyNode",
        "groupNode",
        "sourceGroupNode",
        "destinationGroupNode",
        "peerNode",
        "sourcePeerNode",
        "expandedGroupPeer",
        "resourceNode",
        "destinationResourceNode",
        "networkNode",
      ]);
      if (!draft.isDraft && !LIVE_MENU_TYPES.has(node.type ?? "")) return;
      event.preventDefault();
      setNodeContextMenuPos({ x: event.clientX, y: event.clientY });
      canvas.setContextMenuNodeId(node.id);
    },
  );
  const stableOnPaneClick = useStableHandler(() => dismissCanvasOverlays());
  const stableOnNodeMouseEnter = useStableHandler(
    (_: React.MouseEvent, node: FlowNode) => {
      // Resource rows are separate nodes, not DOM children, so map a hover on
      // any child back to its frame.
      const frameId = isFrameNode(node)
        ? node.id
        : node.parentId?.startsWith("network-")
        ? node.parentId
        : null;
      setHoveredNetworkNodeId(frameId);
    },
  );
  const stableOnNodeMouseLeave = useStableHandler(() =>
    setHoveredNetworkNodeId(null),
  );
  const stableOnNodeDragStart = useStableHandler(onNodeDragStart);
  const stableOnNodeDrag = useStableHandler(onNodeDrag);
  const stableOnNodeDragStop = useStableHandler(onNodeDragStop);
  // Live mode never deletes (the canvas mirrors the account). In draft the keys
  // act like the menu's Remove, routed through useNodeRemoval for the changeset
  // bookkeeping; React Flow's raw deletion is always blocked.
  const { removeNode } = useNodeRemoval();
  const stableOnBeforeDelete = useStableHandler(
    async ({ nodes }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      if (draft.isDraft) nodes.forEach((n) => removeNode(n));
      return false;
    },
  );
  const stableOnInit = useStableHandler(
    (instance: { setCenter: (x: number, y: number, o?: object) => unknown }) =>
      void instance.setCenter(0, 0, { zoom: EMPTY_STATE_ZOOM }),
  );

  return (
    <>
      {/* Kept mounted here so the live "Add Network" flow survives the empty
          state unmounting once the first network is created. */}
      <NetworkAccessControlProvider>
        <NetworkProvider onNetworkCreated={onLiveNetworkCreated}>
          <ControlCenterEmptyStates />
        </NetworkProvider>
      </NetworkAccessControlProvider>
      <ControlCenterHeader />
      <PeersToolbar />
      <DraftInstallPeerModal />
      <DraftUserDeviceModal />
      <DraftResourceEditorModal />
      <DraftResourceNetworkModal />
      <DraftRoutingPeerModal />
      <DraftNetworkDestinationModal />
      <DraftNetworkEditModal />
      <DraftLeaveGuard />
      <ReactFlow
        className={
          [
            draft.isSelectMode && "select-mode",
            highlightArmed && "cc-focus-armed",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        edges={canvas.edges}
        nodes={canvas.nodes}
        onNodesChange={canvas.onNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        proOptions={PRO_OPTIONS}
        onConnect={stableOnConnect}
        onBeforeDelete={stableOnBeforeDelete}
        connectionLineComponent={ConnectionLine}
        onNodeClick={stableOnNodeClick}
        onNodeContextMenu={stableOnNodeContextMenu}
        onPaneClick={stableOnPaneClick}
        onNodeMouseEnter={stableOnNodeMouseEnter}
        onNodeMouseLeave={stableOnNodeMouseLeave}
        onNodeDragStart={stableOnNodeDragStart}
        onNodeDrag={stableOnNodeDrag}
        onNodeDragStop={stableOnNodeDragStop}
        nodeTypes={NODE_TYPES as unknown as NodeTypes}
        edgeTypes={EDGE_TYPES as unknown as EdgeTypes}
        fitView={false}
        // Don't re-sort edges into elevated SVG groups on select/drag start —
        // the DOM reshuffle restarts every edge's dash animation (visible
        // flicker the moment a drag begins).
        elevateEdgesOnSelect={false}
        defaultViewport={DEFAULT_VIEWPORT}
        // Center the origin on mount — defaultViewport {0,0} anchors it at
        // the screen corner, so the first fit would animate in from far away.
        onInit={stableOnInit}
        maxZoom={DEFAULT_MAX_ZOOM}
        minZoom={DEFAULT_MIN_ZOOM}
        colorMode={"dark"}
        panOnDrag={canInteract}
        panOnScroll={draft.isSelectMode && !emptyState}
        zoomOnScroll={canInteract}
        zoomOnPinch={canInteract}
        zoomOnDoubleClick={canInteract}
        // Not gated on anyMenuOpen: flipping these re-renders every node wrapper
        // and lagged right-click. Nodes staying interactive behind the menu is
        // harmless; pan/zoom stay locked via canInteract.
        nodesDraggable={!emptyState && !focusMode}
        nodesConnectable={!emptyState}
        elementsSelectable={!emptyState}
        selectionOnDrag={draft.isSelectMode && !emptyState}
        selectionMode={SelectionMode.Partial}
      >
        <Background bgColor={"#181a1d"} gap={20} color={"#717171"} />
        <CanvasContextMenu onOpenChange={setContextMenuOpen} />
        <NodeContextMenu
          position={nodeContextMenuPos}
          nodeId={canvas.contextMenuNodeId}
          onClose={closeNodeContextMenu}
          onDismiss={dismissCanvasOverlays}
        />
      </ReactFlow>
    </>
  );
}
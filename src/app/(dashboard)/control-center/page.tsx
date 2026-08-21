"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Edge as FlowEdge,
  EdgeTypes,
  type Node as FlowNode,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from "@xyflow/react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import GroupsProvider from "@/contexts/GroupsProvider";
import PeersProvider from "@/contexts/PeersProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Network } from "@/interfaces/Network";
import PageContainer from "@/layouts/PageContainer";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";
import {
  CanvasStateProvider,
  ControlCenterUIProvider,
  useCanvasState,
  useControlCenterUI,
  useDestinationGroup,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { ControlCenterPolicyProvider } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { DragAndDropProvider } from "@/modules/control-center/contexts/DragAndDropProvider";
import { ControlCenterComponentsPanel } from "@/modules/control-center/draft/ControlCenterComponentsPanel";
import { DraftChangesetProvider } from "@/modules/control-center/draft/DraftChangesetContext";
import { DraftHistoryProvider } from "@/modules/control-center/draft/DraftHistoryContext";
import { DraftLeaveGuard } from "@/modules/control-center/draft/DraftLeaveGuard";
import {
  DraftModeProvider,
  useDraftMode,
  useNetworkHover,
} from "@/modules/control-center/draft/DraftModeContext";
import { DraftInstallPeerModal } from "@/modules/control-center/draft/modals/DraftInstallPeerModal";
import { DraftNetworkDestinationModal } from "@/modules/control-center/draft/modals/DraftNetworkDestinationModal";
import { DraftNetworkEditModal } from "@/modules/control-center/draft/modals/DraftNetworkEditModal";
import { DraftResourceEditorModal } from "@/modules/control-center/draft/modals/DraftResourceEditorModal";
import { DraftResourceNetworkModal } from "@/modules/control-center/draft/modals/DraftResourceNetworkModal";
import { DraftRoutingPeerModal } from "@/modules/control-center/draft/modals/DraftRoutingPeerModal";
import { DraftUserDeviceModal } from "@/modules/control-center/draft/modals/DraftUserDeviceModal";
import { PeersToolbar } from "@/modules/control-center/draft/PeersToolbar";
import { ConnectionLine } from "@/modules/control-center/edges/ConnectionLine";
import { ControlCenterEmptyStates } from "@/modules/control-center/header/ControlCenterEmptyStates";
import { ControlCenterHeader } from "@/modules/control-center/header/ControlCenterHeader";
import { useDraft } from "@/modules/control-center/hooks/useDraft";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import { useDrillDownBrowserHistory } from "@/modules/control-center/hooks/useDrillDownBrowserHistory";
import { useGroupFocusDim } from "@/modules/control-center/hooks/useGroupFocusDim";
import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";
import { CanvasContextMenu } from "@/modules/control-center/menus/CanvasContextMenu";
import { NodeContextMenu } from "@/modules/control-center/menus/NodeContextMenu";
import { groupPanelCloseGuard } from "@/modules/control-center/panels/DestinationGroupPanel";
import { EDGE_TYPES } from "@/modules/control-center/utils/edges";
import { isFrameNode } from "@/modules/control-center/utils/helpers";
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  EMPTY_STATE_ZOOM,
} from "@/modules/control-center/utils/layouts";
import { NODE_TYPES } from "@/modules/control-center/utils/nodes";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";

export default function ControlCenter() {
  return (
    <DraftModeProvider>
      <DragAndDropProvider>
        <ReactFlowProvider>
          <PoliciesProvider>
            <AIProvidersProvider>
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
            </AIProvidersProvider>
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
      // The single-network view builds from the revalidated /networks list.
      await mutate("/networks");
      ui.onNetworkSelect(network.id, null, true);
    },
    [mutate, ui],
  );

  const onLiveResourceCreated = React.useCallback(() => {
    canvas.setLayoutInitialized(false);
  }, [canvas]);

  // Per-render callbacks would re-render the whole canvas each drag tick.
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
  // A blank draft has no overlay, so it stays interactive.
  const emptyState =
    canvas.nodes.length === 0 &&
    !componentsPanelOpen &&
    !(draft.isDraft && draft.startedBlank);
  const canInteract = !anyMenuOpen && !draft.isSelectMode && !emptyState;

  // Closes only the menu, so picking e.g. "Details" keeps the panel it opened.
  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
  }, [canvas]);

  // The group panel may register a discard-confirm guard; wait on it first.
  const dismissCanvasOverlays = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
    setComponentsPanelOpen(false);
    // Focus mode intentionally survives pane clicks.
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
      // In live mode every other node keeps the browser's default menu.
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
      // Resource rows are separate nodes, not DOM children of the frame.
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
      {/* Kept mounted so the live "Add Network" flow survives the empty state
          unmounting. */}
      <NetworkAccessControlProvider>
        <NetworkProvider
          onNetworkCreated={onLiveNetworkCreated}
          onResourceCreated={onLiveResourceCreated}
        >
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
        className={highlightArmed ? "cc-focus-armed" : undefined}
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
        // Elevating edges restarts their dash animation, which flickers on
        // drag start.
        elevateEdgesOnSelect={false}
        defaultViewport={DEFAULT_VIEWPORT}
        // Without this the origin sits in the screen corner and the first fit
        // animates in from far away.
        onInit={stableOnInit}
        maxZoom={DEFAULT_MAX_ZOOM}
        minZoom={DEFAULT_MIN_ZOOM}
        colorMode={"dark"}
        panOnDrag={canInteract}
        panOnScroll={draft.isSelectMode && !emptyState}
        zoomOnScroll={canInteract}
        zoomOnPinch={!anyMenuOpen && !emptyState}
        zoomOnDoubleClick={canInteract}
        // Not gated on anyMenuOpen: flipping these re-renders every node
        // wrapper and lagged right-click.
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

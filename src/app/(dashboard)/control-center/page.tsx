"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  EdgeTypes,
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
} from "@/modules/control-center/draft/DraftModeContext";
import { CanvasContextMenu } from "@/modules/control-center/CanvasContextMenu";
import { NodeContextMenu } from "@/modules/control-center/NodeContextMenu";
import { PeersToolbar } from "@/modules/control-center/draft/PeersToolbar";
import { DraftInstallPeerModal } from "@/modules/control-center/draft/DraftInstallPeerModal";
import { DraftResourceEditorModal } from "@/modules/control-center/draft/DraftResourceEditorModal";
import { DraftResourceNetworkModal } from "@/modules/control-center/draft/DraftResourceNetworkModal";
import { DraftNetworkDestinationModal } from "@/modules/control-center/draft/DraftNetworkDestinationModal";
import { DraftNetworkEditModal } from "@/modules/control-center/draft/DraftNetworkEditModal";
import { DraftRoutingPeerModal } from "@/modules/control-center/draft/DraftRoutingPeerModal";
import { DraftEmptyCanvas } from "@/modules/control-center/draft/DraftEmptyCanvas";
import { DraftLeaveGuard } from "@/modules/control-center/draft/DraftLeaveGuard";
import { useDraft } from "@/modules/control-center/hooks/useDraft";
import { ControlCenterHeader } from "@/modules/control-center/ControlCenterHeader";
import { ControlCenterEmptyStates } from "@/modules/control-center/ControlCenterEmptyStates";
import {
  CanvasStateProvider,
  ControlCenterUIProvider,
  useCanvasState,
  useControlCenterUI,
} from "@/modules/control-center/ControlCenterContext";
import { ControlCenterPolicyProvider } from "@/modules/control-center/ControlCenterPolicyModals";
import { DraftChangesetProvider } from "@/modules/control-center/draft/DraftChangesetContext";
import { DraftHistoryProvider } from "@/modules/control-center/draft/DraftHistoryContext";
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
import { isFrameNode } from "@/modules/control-center/utils/helpers";
import GroupsProvider from "@/contexts/GroupsProvider";

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

function ControlCenterCanvas() {
  const canvas = useCanvasState();
  const ui = useControlCenterUI();
  const draft = useDraft();
  const { componentsPanelOpen, setComponentsPanelOpen, setHoveredNetworkNodeId } =
    useDraftMode();
  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useDragToGroup();

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [nodeContextMenuPos, setNodeContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const nodeContextMenuOpen = nodeContextMenuPos !== null;
  const anyMenuOpen = contextMenuOpen || nodeContextMenuOpen;
  // An empty state overlay is up (live peers/networks empty, or the draft start
  // screen) — lock canvas interactions. Once the user starts (opens the
  // components panel) the empty canvas becomes interactive again.
  const emptyState = canvas.nodes.length === 0 && !componentsPanelOpen;
  const canInteract = !anyMenuOpen && !draft.isSelectMode && !emptyState;

  // Closes just the context menu — used after picking a menu item (so an
  // action like "Details", which opens the group panel, isn't undone).
  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
  }, [canvas]);

  // A click OUTSIDE dismisses everything at once — the context menu AND any
  // open panel/components picker — so the user never has to click twice.
  const dismissCanvasOverlays = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
    canvas.setSelectedDestinationGroup("");
    setComponentsPanelOpen(false);
  }, [canvas]);

  return (
    <>
      <ControlCenterEmptyStates />
      <DraftEmptyCanvas />
      <ControlCenterHeader />
      <PeersToolbar />
      <DraftInstallPeerModal />
      <DraftResourceEditorModal />
      <DraftResourceNetworkModal />
      <DraftRoutingPeerModal />
      <DraftNetworkDestinationModal />
      <DraftNetworkEditModal />
      <DraftLeaveGuard />
      <ReactFlow
        className={draft.isSelectMode ? "select-mode" : undefined}
        edges={canvas.edges}
        nodes={canvas.nodes}
        onNodesChange={canvas.onNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        proOptions={{ hideAttribution: true }}
        onConnect={draft.onNodeConnect}
        connectionLineComponent={ConnectionLine}
        onNodeClick={ui.onNodeClick}
        onNodeContextMenu={(event, node) => {
          // Live mode keeps the browser's default context menu.
          if (!draft.isDraft) return;
          event.preventDefault();
          setNodeContextMenuPos({ x: event.clientX, y: event.clientY });
          canvas.setContextMenuNodeId(node.id);
        }}
        onPaneClick={() => {
          dismissCanvasOverlays();
        }}
        onNodeMouseEnter={(_, node) => {
          // Hovering a frame OR anything inside it (resource rows are
          // separate ReactFlow nodes, not DOM children) highlights the frame
          // — draft and live network frames alike.
          const frameId = isFrameNode(node)
            ? node.id
            : node.parentId?.startsWith("network-")
            ? node.parentId
            : null;
          setHoveredNetworkNodeId(frameId);
        }}
        onNodeMouseLeave={() => setHoveredNetworkNodeId(null)}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={NODE_TYPES as unknown as NodeTypes}
        edgeTypes={EDGE_TYPES as unknown as EdgeTypes}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: EMPTY_STATE_ZOOM }}
        // Center the origin on mount — defaultViewport {0,0} anchors it at
        // the screen corner, so the first fit would animate in from far away.
        onInit={(instance) =>
          void instance.setCenter(0, 0, { zoom: EMPTY_STATE_ZOOM })
        }
        maxZoom={DEFAULT_MAX_ZOOM}
        minZoom={DEFAULT_MIN_ZOOM}
        colorMode={"dark"}
        panOnDrag={canInteract}
        panOnScroll={draft.isSelectMode && !emptyState}
        zoomOnScroll={canInteract}
        zoomOnPinch={canInteract}
        zoomOnDoubleClick={canInteract}
        nodesDraggable={!anyMenuOpen && !emptyState}
        nodesConnectable={!anyMenuOpen && !emptyState}
        elementsSelectable={!anyMenuOpen && !emptyState}
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
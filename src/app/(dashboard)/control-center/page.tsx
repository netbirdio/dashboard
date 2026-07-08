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
import { ControlCenterComponentsSidebar } from "@/modules/control-center/draft/ControlCenterComponentsSidebar";
import { DraftModeProvider } from "@/modules/control-center/draft/DraftModeContext";
import { CanvasContextMenu } from "@/modules/control-center/CanvasContextMenu";
import { NodeContextMenu } from "@/modules/control-center/NodeContextMenu";
import { PeersToolbar } from "@/modules/control-center/draft/PeersToolbar";
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
import { useDragToGroup } from "@/modules/control-center/hooks/useDragToGroup";
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
                <ControlCenterPolicyProvider>
                  <DraftChangesetProvider>
                  <PageContainer>
                    <ControlCenterUIProvider
                      sidebar={<ControlCenterComponentsSidebar />}
                    >
                      <ControlCenterCanvas />
                    </ControlCenterUIProvider>
                  </PageContainer>
                  </DraftChangesetProvider>
                </ControlCenterPolicyProvider>
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
  const { onNodeDrag, onNodeDragStop } = useDragToGroup();

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [nodeContextMenuPos, setNodeContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const nodeContextMenuOpen = nodeContextMenuPos !== null;
  const anyMenuOpen = contextMenuOpen || nodeContextMenuOpen;
  const canInteract = !anyMenuOpen && !draft.isSelectMode;

  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
  }, [canvas]);

  return (
    <>
      <ControlCenterEmptyStates />
      <ControlCenterHeader />
      <PeersToolbar />
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
          event.preventDefault();
          setNodeContextMenuPos({ x: event.clientX, y: event.clientY });
          canvas.setContextMenuNodeId(node.id);
        }}
        onPaneClick={() => canvas.setSelectedDestinationGroup("")}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={NODE_TYPES as unknown as NodeTypes}
        edgeTypes={EDGE_TYPES as unknown as EdgeTypes}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: EMPTY_STATE_ZOOM }}
        maxZoom={DEFAULT_MAX_ZOOM}
        minZoom={DEFAULT_MIN_ZOOM}
        colorMode={"dark"}
        panOnDrag={canInteract}
        panOnScroll={draft.isSelectMode}
        zoomOnScroll={canInteract}
        zoomOnPinch={canInteract}
        zoomOnDoubleClick={canInteract}
        nodesDraggable={!anyMenuOpen}
        nodesConnectable={!anyMenuOpen}
        elementsSelectable={!anyMenuOpen}
        selectionOnDrag={draft.isSelectMode}
        selectionMode={SelectionMode.Partial}
      >
        <Background bgColor={"#181a1d"} gap={20} color={"#717171"} />
        <CanvasContextMenu onOpenChange={setContextMenuOpen} />
        <NodeContextMenu
          position={nodeContextMenuPos}
          nodeId={canvas.contextMenuNodeId}
          onClose={closeNodeContextMenu}
        />
      </ReactFlow>
    </>
  );
}
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
  // Focus mode (explicit, via a node's context-menu Focus item or the header
  // tool — NOT a mere left-click panel open): node dragging is disabled so
  // dragging anywhere pans the canvas instead of accidentally moving dimmed
  // nodes. Applies in live and draft alike.
  const { focusedNodeId, highlightArmed, setSelectedPeerPanel } =
    useDestinationGroup();
  const focusMode = focusedNodeId !== "";
  const { setHoveredNetworkNodeId } = useNetworkHover();
  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useDragToGroup();
  useDrillDownBrowserHistory();
  useGroupFocusDim();

  // ReactFlow re-renders whenever the nodes prop changes (every drag tick);
  // its internal GraphView bails via memo ONLY when all other props keep
  // their identity. Inline/per-render callbacks defeated that memo and made
  // every tick re-render the WHOLE canvas subtree (~2700 fibers, 120ms+ —
  // measured with the React profiler). Every handler below goes through a
  // stable wrapper.
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
  // An empty state overlay is up (live peers/networks empty, or the draft start
  // screen) — lock canvas interactions. Once the user starts (opens the
  // components panel) the empty canvas becomes interactive again. A blank draft
  // shows no overlay, so its empty canvas stays interactive (pannable).
  const emptyState =
    canvas.nodes.length === 0 &&
    !componentsPanelOpen &&
    !(draft.isDraft && draft.startedBlank);
  const canInteract = !anyMenuOpen && !draft.isSelectMode && !emptyState;

  // Closes just the context menu — used after picking a menu item (so an
  // action like "Details", which opens the group panel, isn't undone).
  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenuPos(null);
    canvas.setContextMenuNodeId("");
  }, [canvas, setSelectedPeerPanel]);

  // A click OUTSIDE dismisses everything at once — the context menu AND any
  // open panel/components picker — so the user never has to click twice.
  // The group panel registers a discard-confirm guard while it has
  // unassigned toggles; closing it waits for that dialog.
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
      // Live mode context menus: policies (Edit / Disable behind
      // confirmations), groups (Details / Rename / Delete), and peers and
      // resources (Focus, when the neighborhood is busy enough). Everything
      // else keeps the browser menu.
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
      // Hovering a frame OR anything inside it (resource rows are separate
      // ReactFlow nodes, not DOM children) highlights the frame — draft and
      // live network frames alike.
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
  // Backspace/Delete gate: live mode deletes NOTHING (the canvas mirrors the
  // account). In draft the keys act exactly like the context menu's Remove —
  // routed through useNodeRemoval so the changeset bookkeeping (cancelled
  // creates, policy disconnects, group refs) happens; React Flow's raw
  // deletion is always blocked. Nodes without a Remove action (existing
  // framed resources) are skipped, and standalone edges never delete.
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
      <ControlCenterEmptyStates />
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
            // Armed Focus Mode: nodes get the dashed sky hover halo.
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
        nodesDraggable={!anyMenuOpen && !emptyState && !focusMode}
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
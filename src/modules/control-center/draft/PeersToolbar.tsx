import * as React from "react";
import { useEffect, useMemo } from "react";
import { CircleXIcon, FolderPlusIcon, TrashIcon } from "lucide-react";
import { useReactFlow, useStoreApi, useViewport } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCreateGroupOnCanvas } from "@/modules/control-center/hooks/useCreateGroupOnCanvas";
import {
  GROUP_NODE_TYPES,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { CreateGroupNameModal } from "@/modules/control-center/draft/CreateGroupNameModal";
import { ToolbarButton } from "@/modules/control-center/toolbar/ToolbarButton";
import { ToolbarContainer } from "@/modules/control-center/toolbar/ToolbarContainer";
import { ToolbarGroup } from "@/modules/control-center/toolbar/ToolbarGroup";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import {
  getDraftResource,
  getPlaceholderPeer,
  getPolicyRegroupUpdates,
} from "@/modules/control-center/utils/helpers";

const GROUPABLE_NODE_TYPES = new Set([
  "peerNode",
  "sourcePeerNode",
  "expandedGroupPeer",
  "resourceNode",
  "destinationResourceNode",
]);

const PEER_NODE_TYPES = new Set([
  "peerNode",
  "sourcePeerNode",
  "expandedGroupPeer",
]);

const RESOURCE_NODE_TYPES = new Set([
  "resourceNode",
  "destinationResourceNode",
]);

export const PeersToolbar = () => {
  const { isDraft } = useDraftMode();
  const { nodes, setNodes, setEdges } = useCanvasState();
  const reactFlow = useReactFlow();
  const { groups } = useControlCenterData();

  // Name validation must also cover groups that only exist in the draft.
  const allGroups = useMemo(() => {
    const draftGroups = nodes
      .map((n) => n.data?.group as Group | undefined)
      .filter((g): g is Group => !!g && !g.id);
    return [...(groups ?? []), ...draftGroups];
  }, [groups, nodes]);
  const { createGroup, modalOpen, setModalOpen } = useCreateGroupOnCanvas();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const [mouseDown, setMouseDown] = React.useState(false);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      const target = e.target as HTMLElement;
      if (target.closest(".react-flow__pane")) {
        setMouseDown(true);
      }
    };
    const onUp = () => setMouseDown(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const selectedGroupableNodes = useMemo(() => {
    if (!isDraft) return [];
    const selected = nodes.filter((n) => n.selected);
    const allGroupable =
      selected.length >= 2 &&
      selected.every((n) => GROUPABLE_NODE_TYPES.has(n.type ?? ""));
    return allGroupable ? selected : [];
  }, [isDraft, nodes]);

  // Selecting multiple group nodes shows a Remove/Delete toolbar instead.
  const selectedGroupNodes = useMemo(() => {
    if (!isDraft) return [];
    const selected = nodes.filter((n) => n.selected);
    const allGroups =
      selected.length >= 2 &&
      selected.every((n) => GROUP_NODE_TYPES.has(n.type ?? ""));
    return allGroups ? selected : [];
  }, [isDraft, nodes]);

  // Any other multi-selection (mixed node types, policies, …) still gets a
  // generic toolbar with Remove.
  const mixedSelectionNodes = useMemo(() => {
    if (!isDraft) return [];
    if (selectedGroupableNodes.length > 0 || selectedGroupNodes.length > 0)
      return [];
    const selected = nodes.filter((n) => n.selected);
    return selected.length >= 2 ? selected : [];
  }, [isDraft, nodes, selectedGroupableNodes, selectedGroupNodes]);

  const selectionNodes =
    selectedGroupableNodes.length > 0
      ? selectedGroupableNodes
      : selectedGroupNodes.length > 0
      ? selectedGroupNodes
      : mixedSelectionNodes;

  const viewport = useViewport();

  const toolbarPosition = useMemo(() => {
    if (selectionNodes.length === 0) return null;
    const bounds = reactFlow.getNodesBounds(selectionNodes);
    const screenX =
      bounds.x * viewport.zoom +
      viewport.x +
      (bounds.width * viewport.zoom) / 2;
    const screenY = bounds.y * viewport.zoom + viewport.y - 12;
    return { x: screenX, y: screenY };
  }, [selectionNodes, reactFlow, viewport]);

  const handleOpenModal = React.useCallback(() => {
    if (selectedGroupableNodes.length < 2) return;
    setModalOpen(true);
  }, [selectedGroupableNodes, setModalOpen]);

  const store = useStoreApi();

  // Clearing selection through the store also hides ReactFlow's
  // multi-selection bounding box (otherwise it survives as a tiny dot).
  const clearSelection = React.useCallback(() => {
    store.getState().resetSelectedElements();
    store.setState({ nodesSelectionActive: false });
  }, [store]);

  const handleSaveGroup = React.useCallback(
    async (groupName: string) => {
      setModalOpen(false);
      if (selectedGroupableNodes.length < 2) return;

      const selectedPeers: Peer[] = [];
      const selectedResources: NetworkResource[] = [];
      // Unassigned draft resources: their nodes leave the canvas with the
      // grouping, so their data rides on the group node — dropping the group
      // into a network frame later assigns them to that network.
      const unassignedDraftResources: NetworkResource[] = [];

      selectedGroupableNodes.forEach((node) => {
        if (PEER_NODE_TYPES.has(node.type ?? "")) {
          // Placeholders join as pseudo-peers with their draft ids — the
          // upgrade flow swaps those for the real peer id on install/select,
          // and deploy filters out any that never materialize.
          const peer = (node.data?.peer as Peer) ?? getPlaceholderPeer(node);
          if (peer) selectedPeers.push(peer);
        }
        if (RESOURCE_NODE_TYPES.has(node.type ?? "")) {
          // Draft resources carry their "new-…" id via getDraftResource (the
          // raw node data has none — it would be dropped from the group).
          const draftResource = getDraftResource(node);
          const resource =
            draftResource ??
            (node.data?.resource as NetworkResource | undefined);
          if (resource) selectedResources.push(resource);
          if (draftResource && !node.data?.draftNetwork) {
            unassignedDraftResources.push(draftResource);
          }
        }
      });

      const bounds = reactFlow.getNodesBounds(selectedGroupableNodes);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      // createGroup records the draft change itself (no API call in draft).
      const createdGroup = await createGroup({
        name: groupName,
        position: { x: centerX - 75, y: centerY - 20 },
        peers: selectedPeers,
        resources: selectedResources,
        unassignedDraftResources,
      });

      if (!createdGroup) return;

      // Remove selected nodes and their edges, group node was already added by createGroup
      const selectedIds = new Set(selectedGroupableNodes.map((n) => n.id));

      setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setEdges((prev) =>
        prev.filter(
          (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target),
        ),
      );

      // Policies that referenced a grouped peer/resource as their single
      // source/destination now point at the new group instead — the peer is
      // gone from the canvas, so the reference would otherwise dangle with
      // no connection. Placeholders count too (their draft ids).
      const groupedIds = new Set<string>();
      selectedPeers.forEach((p) => p.id && groupedIds.add(p.id));
      selectedResources.forEach((r) => groupedIds.add(r.id));

      const policyUpdates = getPolicyRegroupUpdates(
        nodes,
        groupedIds,
        createdGroup,
      );
      if (policyUpdates.length > 0) {
        // Next tick — the node removal must be committed to the canvas
        // before drawPolicyOnCanvas rebuilds the policies' edges.
        setTimeout(() => policyUpdates.forEach((p) => updateDraftPolicy(p)), 0);
      }

      clearSelection();
    },
    [
      selectedGroupableNodes,
      nodes,
      reactFlow,
      setNodes,
      setEdges,
      createGroup,
      updateDraftPolicy,
      setModalOpen,
      clearSelection,
    ],
  );

  const handleCancel = clearSelection;

  const { removeGroup, confirmAndDeleteGroups, removeNodeWithEdges } =
    useDraftGroupActions();

  const handleRemoveGroups = React.useCallback(() => {
    selectedGroupNodes.forEach((n) => removeGroup(n));
    clearSelection();
  }, [selectedGroupNodes, removeGroup, clearSelection]);

  const handleDeleteGroups = React.useCallback(() => {
    void confirmAndDeleteGroups(selectedGroupNodes).then(() =>
      clearSelection(),
    );
  }, [selectedGroupNodes, confirmAndDeleteGroups, clearSelection]);

  // Mixed selection: canvas-only removal. Groups go through removeGroup so a
  // new group's pending changes are dropped with it.
  const handleRemoveSelection = React.useCallback(() => {
    mixedSelectionNodes.forEach((n) => {
      if (GROUP_NODE_TYPES.has(n.type ?? "")) removeGroup(n);
      else removeNodeWithEdges(n.id);
    });
    clearSelection();
  }, [mixedSelectionNodes, removeGroup, removeNodeWithEdges, clearSelection]);

  // Selected peers/resources: canvas-only removal (policy/router references
  // are cleaned by removeNodeWithEdges per node).
  const handleRemoveGroupables = React.useCallback(() => {
    selectedGroupableNodes.forEach((n) => removeNodeWithEdges(n.id));
    clearSelection();
  }, [selectedGroupableNodes, removeNodeWithEdges, clearSelection]);

  useControlCenterShortcuts(
    { g: handleOpenModal },
    selectedGroupableNodes.length >= 2,
  );
  useControlCenterShortcuts(
    { Escape: handleCancel },
    selectionNodes.length >= 2,
  );

  const showToolbar = selectionNodes.length >= 2 && toolbarPosition && !mouseDown;

  return (
    <>
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-[5] -translate-x-1/2 -translate-y-full"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y,
          }}
        >
          <ToolbarContainer className="shadow-lg">
            <ToolbarGroup>
              {selectedGroupableNodes.length >= 2 ? (
                <>
                  <ToolbarButton
                    shortcut="G"
                    onClick={handleOpenModal}
                    className="px-3"
                  >
                    <FolderPlusIcon size={14} />
                    <span className="text-xs ml-2">Create Group</span>
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={handleRemoveGroupables}
                    className="px-3"
                  >
                    <CircleXIcon size={14} />
                    <span className="text-xs ml-2">Remove</span>
                  </ToolbarButton>
                </>
              ) : selectedGroupNodes.length >= 2 ? (
                <>
                  <ToolbarButton onClick={handleRemoveGroups} className="px-3">
                    <CircleXIcon size={14} />
                    <span className="text-xs ml-2">Remove</span>
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={handleDeleteGroups}
                    className="px-3 text-red-500 hover:text-red-400"
                  >
                    <TrashIcon size={14} />
                    <span className="text-xs ml-2">Delete</span>
                  </ToolbarButton>
                </>
              ) : (
                <ToolbarButton
                  onClick={handleRemoveSelection}
                  className="px-3"
                >
                  <CircleXIcon size={14} />
                  <span className="text-xs ml-2">Remove</span>
                </ToolbarButton>
              )}
            </ToolbarGroup>
          </ToolbarContainer>
        </div>
      )}

      <CreateGroupNameModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSaveGroup}
        groups={allGroups}
      />
    </>
  );
};

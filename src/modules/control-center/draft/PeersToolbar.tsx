import * as React from "react";
import { useEffect, useMemo } from "react";
import { FolderPlusIcon, XIcon } from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCreateGroupOnCanvas } from "@/modules/control-center/hooks/useCreateGroupOnCanvas";
import { CreateGroupNameModal } from "@/modules/control-center/draft/CreateGroupNameModal";
import { ToolbarButton } from "@/modules/control-center/toolbar/ToolbarButton";
import { ToolbarContainer } from "@/modules/control-center/toolbar/ToolbarContainer";
import { ToolbarDivider } from "@/modules/control-center/toolbar/ToolbarDivider";
import { ToolbarGroup } from "@/modules/control-center/toolbar/ToolbarGroup";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";

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
  const { addChange } = useDraftChangeset();
  const { groups } = useControlCenterData();
  const { createGroup, modalOpen, setModalOpen } = useCreateGroupOnCanvas();
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

  const viewport = useViewport();

  const toolbarPosition = useMemo(() => {
    if (selectedGroupableNodes.length === 0) return null;
    const bounds = reactFlow.getNodesBounds(selectedGroupableNodes);
    const screenX =
      bounds.x * viewport.zoom +
      viewport.x +
      (bounds.width * viewport.zoom) / 2;
    const screenY = bounds.y * viewport.zoom + viewport.y - 12;
    return { x: screenX, y: screenY };
  }, [selectedGroupableNodes, reactFlow, viewport]);

  const handleOpenModal = React.useCallback(() => {
    if (selectedGroupableNodes.length < 2) return;
    setModalOpen(true);
  }, [selectedGroupableNodes, setModalOpen]);

  const handleSaveGroup = React.useCallback(
    async (groupName: string) => {
      setModalOpen(false);
      if (selectedGroupableNodes.length < 2) return;

      const selectedPeers: Peer[] = [];
      const selectedResources: NetworkResource[] = [];

      selectedGroupableNodes.forEach((node) => {
        if (PEER_NODE_TYPES.has(node.type ?? "") && node.data?.peer) {
          selectedPeers.push(node.data.peer as Peer);
        }
        if (RESOURCE_NODE_TYPES.has(node.type ?? "") && node.data?.resource) {
          selectedResources.push(node.data.resource as NetworkResource);
        }
      });

      const bounds = reactFlow.getNodesBounds(selectedGroupableNodes);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      const createdGroup = await createGroup({
        name: groupName,
        position: { x: centerX - 75, y: centerY - 20 },
        peers: selectedPeers,
        resources: selectedResources,
      });

      if (!createdGroup?.id) return;

      // Remove selected nodes and their edges, group node was already added by createGroup
      const selectedIds = new Set(selectedGroupableNodes.map((n) => n.id));

      setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setEdges((prev) =>
        prev.filter(
          (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target),
        ),
      );

      addChange({
        type: "create-group",
        name: groupName,
        peers: selectedPeers,
        resources: selectedResources,
      });
    },
    [selectedGroupableNodes, reactFlow, setNodes, setEdges, addChange, createGroup, setModalOpen],
  );

  const handleCancel = React.useCallback(() => {
    reactFlow.setNodes((prev) =>
      prev.map((n) => (n.selected ? { ...n, selected: false } : n)),
    );
  }, [reactFlow]);

  useControlCenterShortcuts(
    {
      g: handleOpenModal,
      Escape: handleCancel,
    },
    selectedGroupableNodes.length >= 2,
  );

  const showToolbar =
    selectedGroupableNodes.length >= 2 && toolbarPosition && !mouseDown;

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
            <ToolbarGroup position="first">
              <ToolbarButton
                shortcut="G"
                onClick={handleOpenModal}
                className="px-3"
              >
                <FolderPlusIcon size={14} />
                <span className="text-xs ml-2">Create Group</span>
              </ToolbarButton>
            </ToolbarGroup>

            <ToolbarDivider />

            <ToolbarGroup position="last">
              <ToolbarButton
                tooltip="Cancel Selection"
                shortcut="ESC"
                onClick={handleCancel}
                className="w-8"
              >
                <XIcon size={14} />
              </ToolbarButton>
            </ToolbarGroup>
          </ToolbarContainer>
        </div>
      )}

      <CreateGroupNameModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSaveGroup}
        groups={groups}
      />
    </>
  );
};

import { useCallback } from "react";
import { Node, useReactFlow } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";

const DROPPABLE_NODE_TYPES = new Set([
  "peerNode",
  "sourcePeerNode",
  "expandedGroupPeer",
  "resourceNode",
  "destinationResourceNode",
]);

const GROUP_NODE_TYPES = new Set([
  "groupNode",
  "sourceGroupNode",
  "destinationGroupNode",
]);

function getIntersectingGroup(
  draggedNode: Node,
  reactFlow: ReturnType<typeof useReactFlow>,
): Node | undefined {
  const intersecting = reactFlow.getIntersectingNodes(draggedNode);
  return intersecting.find((n) => GROUP_NODE_TYPES.has(n.type ?? ""));
}

function getDraggedItemId(node: Node): string | undefined {
  const peer = node.data?.peer as Peer | undefined;
  const resource = node.data?.resource as NetworkResource | undefined;
  return peer?.id ?? resource?.id;
}

function groupContainsItem(groupNode: Node, itemId: string): boolean {
  const group = groupNode.data?.group as Group | undefined;
  if (!group) return false;

  // Check existing peers
  const peers = group.peers ?? [];
  const hasPeer = peers.some((p) =>
    typeof p === "string" ? p === itemId : p.id === itemId,
  );
  if (hasPeer) return true;

  // Check existing resources
  const resources = group.resources ?? [];
  const hasResource = resources.some((r) =>
    typeof r === "string" ? r === itemId : r.id === itemId,
  );
  if (hasResource) return true;

  // Check draft-added members
  const addedMembers = (groupNode.data?.addedMembers as Set<string>) ?? new Set();
  return addedMembers.has(itemId);
}

export function useDragToGroup() {
  const { isDraft } = useDraftMode();
  const { setNodes, setEdges } = useCanvasState();
  const { addChange } = useDraftChangeset();
  const reactFlow = useReactFlow();

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isDraft) return;
      if (!DROPPABLE_NODE_TYPES.has(draggedNode.type ?? "")) return;

      const targetGroup = getIntersectingGroup(draggedNode, reactFlow);
      const itemId = getDraggedItemId(draggedNode);

      // Don't highlight if item already belongs to this group
      const canDrop =
        targetGroup && itemId && !groupContainsItem(targetGroup, itemId);

      setNodes((prev) =>
        prev.map((n) => {
          if (!GROUP_NODE_TYPES.has(n.type ?? "")) return n;
          const isTarget = canDrop && targetGroup?.id === n.id;
          if (!!n.data.dropTarget === isTarget) return n;
          return { ...n, data: { ...n.data, dropTarget: isTarget } };
        }),
      );
    },
    [isDraft, reactFlow, setNodes],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isDraft) return;
      if (!DROPPABLE_NODE_TYPES.has(draggedNode.type ?? "")) return;

      // Clear all dropTarget highlights
      setNodes((prev) =>
        prev.map((n) => {
          if (!GROUP_NODE_TYPES.has(n.type ?? "")) return n;
          if (!n.data.dropTarget) return n;
          return { ...n, data: { ...n.data, dropTarget: false } };
        }),
      );

      const targetGroup = getIntersectingGroup(draggedNode, reactFlow);
      if (!targetGroup) return;

      const itemId = getDraggedItemId(draggedNode);
      if (!itemId) return;

      // Don't drop if item already belongs to this group
      if (groupContainsItem(targetGroup, itemId)) return;

      const groupData = targetGroup.data.group as Group;
      const draggedId = draggedNode.id;

      const peer = draggedNode.data?.peer as Peer | undefined;
      const resource = draggedNode.data?.resource as
        | NetworkResource
        | undefined;

      if (!peer && !resource) return;

      // Remove the dragged node and its edges
      setNodes((prev) => prev.filter((n) => n.id !== draggedId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== draggedId && e.target !== draggedId),
      );

      // Update the group node's counts and track added members
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== targetGroup.id) return n;
          const group = {
            ...(n.data.group as Group),
          };
          const addedMembers = new Set(
            (n.data.addedMembers as Set<string>) ?? [],
          );
          addedMembers.add(itemId);

          if (peer) {
            group.peers_count = (group.peers_count || 0) + 1;
          }
          if (resource) {
            group.resources_count = (group.resources_count || 0) + 1;
          }
          return {
            ...n,
            data: { ...n.data, group, addedMembers },
          };
        }),
      );

      addChange({
        type: "create-group",
        name: groupData.name ?? "",
        peers: peer ? [peer] : [],
        resources: resource ? [resource] : [],
      });
    },
    [isDraft, reactFlow, setNodes, setEdges, addChange],
  );

  return { onNodeDrag, onNodeDragStop };
}

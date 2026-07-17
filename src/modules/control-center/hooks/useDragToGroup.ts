import { useCallback, useRef } from "react";
import { Node, useReactFlow } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getPlaceholderPeer,
  getPolicyRegroupUpdates,
} from "@/modules/control-center/utils/helpers";
import {
  DROPPABLE_INTO_GROUP_NODE_TYPES as DROPPABLE_NODE_TYPES,
  getGroupableEntityId,
} from "@/modules/control-center/utils/node-capabilities";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";
import { Group } from "@/interfaces/Group";

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

// Placeholders (Server / Agent / unselected User Device) join with their
// draft ids — the upgrade flow swaps them for the real id on install.
const getDraggedItemId = getGroupableEntityId;

export function groupContainsItem(groupNode: Node, itemId: string): boolean {
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
  const { trackAddGroupMembers, addGroupToDraftResource } =
    useDraftChangeset();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const reactFlow = useReactFlow();

  // Dragging a resource contained in a network frame moves the WHOLE frame
  // (and everything in it): the child's displacement is transferred to the
  // frame each drag tick while the child snaps back to its slot.
  const frameDrag = useRef<{
    childId: string;
    childStart: { x: number; y: number };
    frameId: string;
    frameStart: { x: number; y: number };
  } | null>(null);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      frameDrag.current = null;
      if (!isDraft) return;
      const parentId = draggedNode.parentId;
      if (!parentId?.startsWith("network-new-")) return;
      const frame = reactFlow.getNodes().find((n) => n.id === parentId);
      if (!frame) return;
      frameDrag.current = {
        childId: draggedNode.id,
        childStart: { ...draggedNode.position },
        frameId: frame.id,
        frameStart: { ...frame.position },
      };
      // ReactFlow only elevates the DRAGGED node (the child) — raise the
      // frame too so frame + children ride above other nodes while moving
      // (children inherit the parent's elevation).
      setNodes((prev) =>
        prev.map((n) => (n.id === frame.id ? { ...n, zIndex: 1000 } : n)),
      );
    },
    [isDraft, reactFlow, setNodes],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isDraft) return;

      // Contained resource → transfer the movement to its frame.
      const frame = frameDrag.current;
      if (frame && draggedNode.id === frame.childId) {
        const delta = {
          x: draggedNode.position.x - frame.childStart.x,
          y: draggedNode.position.y - frame.childStart.y,
        };
        if (delta.x === 0 && delta.y === 0) return;
        frame.frameStart = {
          x: frame.frameStart.x + delta.x,
          y: frame.frameStart.y + delta.y,
        };
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === frame.frameId) {
              return { ...n, position: { ...frame.frameStart } };
            }
            if (n.id === frame.childId) {
              return { ...n, position: { ...frame.childStart } };
            }
            return n;
          }),
        );
        return;
      }

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

      // Contained resource → final snap; no group-drop for framed resources.
      const frame = frameDrag.current;
      if (frame && draggedNode.id === frame.childId) {
        frameDrag.current = null;
        setNodes((prev) => {
          // The dropped frame stays on top: TWO above the highest settled z
          // (drag-time elevations of 1000 excluded) — children render at
          // parentZ + 1, so +1 would tie with the other frames' children
          // and lose to DOM order (their resources would paint over this
          // frame).
          const maxZ = Math.max(
            0,
            ...prev.map((n) =>
              typeof n.zIndex === "number" && n.zIndex < 1000 ? n.zIndex : 0,
            ),
          );
          return prev.map((n) => {
            if (n.id === frame.childId) {
              return { ...n, position: { ...frame.childStart } };
            }
            if (n.id === frame.frameId) {
              return { ...n, zIndex: maxZ + 2 };
            }
            return n;
          });
        });
        return;
      }

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

      const peer =
        (draggedNode.data?.peer as Peer | undefined) ??
        getPlaceholderPeer(draggedNode);
      const resource = draggedNode.data?.resource as
        | NetworkResource
        | undefined;

      if (!peer && !resource) return;

      // Remove the dragged node and its edges
      setNodes((prev) => prev.filter((n) => n.id !== draggedId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== draggedId && e.target !== draggedId),
      );

      // Update counts and added members on EVERY canvas instance of the
      // group — a group can appear twice (source node + destination copy),
      // and both must reflect the new member.
      setNodes((prev) =>
        prev.map((n) => {
          const g = n.data?.group as Group | undefined;
          if (!g) return n;
          const sameGroup = groupData.id
            ? g.id === groupData.id
            : !g.id && g.name === groupData.name;
          if (!sameGroup) return n;
          const group = { ...g };
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

      trackAddGroupMembers({
        groupId: groupData.id,
        groupName: groupData.name ?? "",
        peerIds: peer?.id ? [peer.id] : [],
        resourceIds: resource ? [resource.id] : [],
      });

      // Draft resources also carry the group on their own create change —
      // deploy applies groups via the resource's `groups` field, since group
      // changes run before the resource exists.
      if (itemId.startsWith("new-") && draggedId.startsWith("resource-")) {
        addGroupToDraftResource(itemId, groupData.id ?? groupData.name);
      }

      // Policies that referenced the dragged entity as their single
      // source/destination follow it into the group.
      const policyUpdates = getPolicyRegroupUpdates(
        reactFlow.getNodes(),
        new Set([itemId]),
        groupData,
      );
      if (policyUpdates.length > 0) {
        // Next tick — the node removal must be committed to the canvas
        // before drawPolicyOnCanvas rebuilds the policies' edges.
        setTimeout(() => policyUpdates.forEach((p) => updateDraftPolicy(p)), 0);
      }
    },
    [
      isDraft,
      reactFlow,
      setNodes,
      setEdges,
      trackAddGroupMembers,
      addGroupToDraftResource,
      updateDraftPolicy,
    ],
  );

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}

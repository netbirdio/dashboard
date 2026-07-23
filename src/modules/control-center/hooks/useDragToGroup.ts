import { useCallback, useRef } from "react";
import { Node, useReactFlow, XYPosition } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getNetworkRef,
  useDraftNetworkActions,
} from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
  canDropGroupIntoNetwork,
  getFrameChildPosition,
  getPlaceholderPeer,
  getTopZIndex,
  getPolicyRegroupUpdates,
  isFrameNode,
  NETWORK_FRAME_CHILD_WIDTH,
} from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
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

function getIntersectingFrame(
  draggedNode: Node,
  reactFlow: ReturnType<typeof useReactFlow>,
): Node | undefined {
  const intersecting = reactFlow.getIntersectingNodes(draggedNode);
  return intersecting.find(isFrameNode);
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
  const { trackAddGroupMembers, addGroupToDraftResource, trackCreateResource } =
    useDraftChangeset();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { assignResourceToNetwork } = useDraftNetworkActions();
  const { networkResources } = useControlCenterData();
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
  // Last dragged position at which the drop-target highlight ran.
  const lastHighlightCheck = useRef<XYPosition | null>(null);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      frameDrag.current = null;
      lastHighlightCheck.current = null;
      if (!isDraft) return;
      const parentId = draggedNode.parentId;
      if (!parentId?.startsWith("network-")) return;
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

      // The drop-target highlight branches below run intersection tests over
      // the whole canvas — throttle them to ~every 8px of movement instead
      // of every pointer-move tick (a real cost with many network frames).
      const last = lastHighlightCheck.current;
      if (
        last &&
        Math.abs(draggedNode.position.x - last.x) < 8 &&
        Math.abs(draggedNode.position.y - last.y) < 8
      ) {
        return;
      }
      lastHighlightCheck.current = { ...draggedNode.position };

      // Standalone draft resource → highlight the network frame it's over as
      // a drop target (mirrors the group-drop highlight below).
      if (
        draggedNode.id.startsWith("resource-new-") &&
        !draggedNode.parentId
      ) {
        const targetFrame = getIntersectingFrame(draggedNode, reactFlow);
        setNodes((prev) => {
          let changed = false;
          const next = prev.map((n) => {
            if (!isFrameNode(n)) return n;
            const isTarget = targetFrame?.id === n.id;
            if (!!n.data.dropTarget === isTarget) return n;
            changed = true;
            return { ...n, data: { ...n.data, dropTarget: isTarget } };
          });
          // Same array when nothing flipped — a new identity per drag tick
          // re-rendered the whole canvas.
          return changed ? next : prev;
        });
        return;
      }

      // Group → highlight the frame it's over when it may drop in (empty
      // group, or one of the network's resources belongs to it).
      if (GROUP_NODE_TYPES.has(draggedNode.type ?? "") && !draggedNode.parentId) {
        const targetFrame = getIntersectingFrame(draggedNode, reactFlow);
        const eligible =
          !!targetFrame &&
          canDropGroupIntoNetwork(
            draggedNode,
            targetFrame,
            reactFlow.getNodes(),
            networkResources,
          );
        setNodes((prev) => {
          let changed = false;
          const next = prev.map((n) => {
            if (!isFrameNode(n)) return n;
            const isTarget = eligible && targetFrame?.id === n.id;
            if (!!n.data.dropTarget === isTarget) return n;
            changed = true;
            return { ...n, data: { ...n.data, dropTarget: isTarget } };
          });
          return changed ? next : prev;
        });
        return;
      }

      if (!DROPPABLE_NODE_TYPES.has(draggedNode.type ?? "")) return;

      const targetGroup = getIntersectingGroup(draggedNode, reactFlow);
      const itemId = getDraggedItemId(draggedNode);

      // Don't highlight if item already belongs to this group
      const canDrop =
        targetGroup && itemId && !groupContainsItem(targetGroup, itemId);

      setNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          if (!GROUP_NODE_TYPES.has(n.type ?? "")) return n;
          const isTarget = canDrop && targetGroup?.id === n.id;
          if (!!n.data.dropTarget === isTarget) return n;
          changed = true;
          return { ...n, data: { ...n.data, dropTarget: isTarget } };
        });
        return changed ? next : prev;
      });
    },
    [isDraft, reactFlow, setNodes, networkResources],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isDraft) return;

      // Always clear frame drop-target highlights first, regardless of where
      // the drag ends (the branches below return early).
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          if (!(isFrameNode(n) && n.data.dropTarget)) return n;
          changed = true;
          return { ...n, data: { ...n.data, dropTarget: false } };
        });
        return changed ? next : prev;
      });

      // Whatever was dragged settles on top — e.g. a peer dropped over a
      // network frame must paint above it, not behind. Frame children are
      // handled by the frame branch below (they ride their parent's z).
      if (!draggedNode.parentId) {
        setNodes((prev) => {
          const z = getTopZIndex(prev);
          return prev.map((n) =>
            n.id === draggedNode.id ? { ...n, zIndex: z } : n,
          );
        });
      }

      // Contained resource → final snap; no group-drop for framed resources.
      const frame = frameDrag.current;
      if (frame && draggedNode.id === frame.childId) {
        frameDrag.current = null;
        setNodes((prev) => {
          // The dropped frame stays on top (see getTopZIndex for why +2).
          const z = getTopZIndex(prev);
          return prev.map((n) => {
            if (n.id === frame.childId) {
              return { ...n, position: { ...frame.childStart } };
            }
            if (n.id === frame.frameId) {
              return { ...n, zIndex: z };
            }
            return n;
          });
        });
        return;
      }

      // Standalone draft resource dropped onto a network frame → assign it to
      // that network (reparents into the frame). The other way to assign is
      // the "No Network" picker.
      if (
        draggedNode.id.startsWith("resource-new-") &&
        !draggedNode.parentId
      ) {
        const targetFrame = getIntersectingFrame(draggedNode, reactFlow);
        if (targetFrame) {
          assignResourceToNetwork({
            resourceNodeId: draggedNode.id,
            networkNodeId: targetFrame.id,
          });
          return;
        }
      }

      // Group dropped onto a network frame → the node becomes a resource-
      // group row INSIDE the frame (frame-managed flat row, same id so its
      // policy edges follow — they re-attach to the frame like a framed
      // resource's). Only eligible groups drop in: empty, or with at least
      // one resource that's part of that network. Canvas-only in v1.
      if (GROUP_NODE_TYPES.has(draggedNode.type ?? "") && !draggedNode.parentId) {
        const targetFrame = getIntersectingFrame(draggedNode, reactFlow);
        if (
          targetFrame &&
          canDropGroupIntoNetwork(
            draggedNode,
            targetFrame,
            reactFlow.getNodes(),
            networkResources,
          )
        ) {
          setNodes((prev) => {
            const dragged = prev.find((n) => n.id === draggedNode.id);
            const frameIdx = prev.findIndex((n) => n.id === targetFrame.id);
            if (!dragged || frameIdx === -1) return prev;
            const converted: Node = {
              ...dragged,
              type: NodeType.ResourceGroupNode,
              parentId: targetFrame.id,
              // Index -1 sorts above every existing child — the reconciling
              // frame layout re-sorts and repositions everything.
              position: getFrameChildPosition(-1),
              style: { ...dragged.style, width: NETWORK_FRAME_CHILD_WIDTH },
              // Children inherit the frame's elevation.
              zIndex: undefined,
            };
            const others = prev.filter((n) => n.id !== draggedNode.id);
            // Parents must precede children — insert right after the frame.
            const at = others.findIndex((n) => n.id === targetFrame.id) + 1;
            return [...others.slice(0, at), converted, ...others.slice(at)];
          });

          // Unassigned draft resources carried by the group (their standalone
          // cards left the canvas when grouped) get assigned to this network:
          // a create-resource change per resource, group membership included.
          // Incomplete ones (no address yet) stay untracked, like standalone.
          const carried = (
            draggedNode.data as { draftResources?: NetworkResource[] }
          )?.draftResources;
          const networkRef = getNetworkRef(targetFrame);
          const group = (draggedNode.data as { group?: Group })?.group;
          if (carried?.length && networkRef && group) {
            carried.forEach((r) => {
              if (!r.id || !r.address) return;
              trackCreateResource({
                clientId: r.id,
                name: r.name,
                description: r.description,
                address: r.address,
                networkId: networkRef.networkId,
                networkClientId: networkRef.networkClientId,
                networkName: networkRef.name ?? "",
                groupIds: [group.id ?? group.name],
                enabled: r.enabled !== false,
              });
            });
          }
        }
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
      trackCreateResource,
      networkResources,
      updateDraftPolicy,
      assignResourceToNetwork,
    ],
  );

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}

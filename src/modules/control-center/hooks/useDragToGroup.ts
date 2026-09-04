import { useCallback, useRef } from "react";
import { Node, useReactFlow, XYPosition } from "@xyflow/react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getNetworkRef,
  useDraftNetworkActions,
} from "@/modules/control-center/hooks/useDraftNetworkActions";
import {
  canDropGroupIntoNetwork,
  getDraftResource,
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
import {
  patchGroupInPolicies,
  sameGroupMatcher,
} from "@/modules/control-center/utils/policy-group-sync";

const GROUP_NODE_TYPES = new Set([
  "groupNode",
  "sourceGroupNode",
  "destinationGroupNode",
  // A framed resource group accepts resource drops in the drilled network view.
  "resourceGroupNode",
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

const getDraggedItemId = getGroupableEntityId;

function groupContainsItem(groupNode: Node, itemId: string): boolean {
  const group = groupNode.data?.group as Group | undefined;
  if (!group) return false;

  // A member removed in the draft isn't contained; re-adding reverts it.
  const removedMembers = groupNode.data?.removedMembers as
    | Set<string>
    | undefined;
  if (removedMembers?.has(itemId)) return false;

  const peers = group.peers ?? [];
  const hasPeer = peers.some((p) =>
    typeof p === "string" ? p === itemId : p.id === itemId,
  );
  if (hasPeer) return true;

  const resources = group.resources ?? [];
  const hasResource = resources.some((r) =>
    typeof r === "string" ? r === itemId : r.id === itemId,
  );
  if (hasResource) return true;

  const addedMembers = (groupNode.data?.addedMembers as Set<string>) ?? new Set();
  return addedMembers.has(itemId);
}

export function useDragToGroup() {
  const { isDraft, drillDownNetworkNodeId } = useDraftMode();
  const { setNodes, setEdges } = useCanvasState();
  const { trackAddGroupMembers, addGroupToDraftResource, trackCreateResource } =
    useDraftChangeset();
  const { updateDraftPolicy } = useControlCenterPolicy();
  const { assignResourceToNetwork } = useDraftNetworkActions();
  const { networkResources } = useControlCenterData();
  const reactFlow = useReactFlow();

  const addMemberToGroup = useCallback(
    (
      targetGroup: Node,
      {
        peer,
        resource,
        itemId: itemIdOverride,
        draggedNodeId,
      }: {
        peer?: Peer;
        resource?: NetworkResource;
        itemId?: string;
        draggedNodeId?: string;
      },
    ) => {
      const itemId = itemIdOverride ?? peer?.id ?? resource?.id;
      if (!itemId) return;
      if (!peer && !resource) return;
      if (groupContainsItem(targetGroup, itemId)) return;

      const groupData = targetGroup.data.group as Group;
      // "All" is system-managed: every peer is in it implicitly.
      if (groupData.name === "All") return;

      if (draggedNodeId) {
        setNodes((prev) => prev.filter((n) => n.id !== draggedNodeId));
        setEdges((prev) =>
          prev.filter(
            (e) => e.source !== draggedNodeId && e.target !== draggedNodeId,
          ),
        );
      }

      const bumpCounts = (g: Group): Group => ({
        ...g,
        peers_count: peer ? (g.peers_count || 0) + 1 : g.peers_count,
        resources_count: resource
          ? (g.resources_count || 0) + 1
          : g.resources_count,
      });

      // A draft peer joins "All" on install; real peers are already counted there.
      const bumpsAll = !!peer && itemId.startsWith("draft-");
      const isAllMatcher = (g: Group) => g.name === "All";

      // Draft members aren't in the API lists, so their full objects ride the node.
      const draftPeerMember =
        peer && itemId.startsWith("draft-") ? peer : undefined;
      const draftResourceMember =
        resource && itemId.startsWith("new-") ? resource : undefined;
      const withDraftMembers = (data: Record<string, unknown>) => {
        if (draftPeerMember) {
          const held = (data.draftPeers as Peer[] | undefined) ?? [];
          if (!held.some((p) => p.id === itemId)) {
            data.draftPeers = [...held, draftPeerMember];
          }
        }
        if (draftResourceMember) {
          const held = (data.draftResources as NetworkResource[]) ?? [];
          if (!held.some((r) => r.id === itemId)) {
            data.draftResources = [...held, draftResourceMember];
          }
        }
        return data;
      };

      // A group can appear twice, and policy nodes/edges hold their own copies.
      setNodes((prev) => {
        let next = prev.map((n) => {
          const g = n.data?.group as Group | undefined;
          if (!g) return n;
          const sameGroup = groupData.id
            ? g.id === groupData.id
            : !g.id && g.name === groupData.name;
          const allBystander =
            !sameGroup &&
            bumpsAll &&
            g.name === "All" &&
            !groupContainsItem(n, itemId);
          if (!sameGroup && !allBystander) return n;
          const removedMembers = new Set(
            (n.data.removedMembers as Set<string>) ?? [],
          );
          const addedMembers = new Set(
            (n.data.addedMembers as Set<string>) ?? [],
          );
          if (removedMembers.has(itemId)) removedMembers.delete(itemId);
          else addedMembers.add(itemId);

          return {
            ...n,
            data: withDraftMembers({
              ...n.data,
              group: bumpCounts(g),
              addedMembers,
              removedMembers,
            }),
          };
        });
        next = patchGroupInPolicies(
          next,
          sameGroupMatcher(groupData),
          bumpCounts,
        );
        if (bumpsAll) {
          next = patchGroupInPolicies(next, isAllMatcher, bumpCounts);
        }
        return next;
      });
      setEdges((prev) => {
        let next = patchGroupInPolicies(
          prev,
          sameGroupMatcher(groupData),
          bumpCounts,
        );
        if (bumpsAll) {
          next = patchGroupInPolicies(next, isAllMatcher, bumpCounts);
        }
        return next;
      });

      trackAddGroupMembers({
        groupId: groupData.id,
        groupName: groupData.name ?? "",
        peerIds: peer?.id ? [peer.id] : [],
        resourceIds: resource ? [resource.id] : [],
      });

      // A draft resource doesn't exist yet, so its groups ride its own field.
      if (itemId.startsWith("new-") && resource) {
        addGroupToDraftResource(itemId, groupData.id ?? groupData.name);
      }

      if (draggedNodeId) {
        const policyUpdates = getPolicyRegroupUpdates(
          reactFlow.getNodes(),
          new Set([itemId]),
          groupData,
        );
        if (policyUpdates.length > 0) {
          // The node removal must hit the canvas before the edges rebuild.
          setTimeout(
            () => policyUpdates.forEach((p) => updateDraftPolicy(p)),
            0,
          );
        }
      }
    },
    [
      setNodes,
      setEdges,
      trackAddGroupMembers,
      addGroupToDraftResource,
      updateDraftPolicy,
      reactFlow,
    ],
  );

  // Dragging a framed resource moves the whole frame, not the child.
  const frameDrag = useRef<{
    childId: string;
    childStart: { x: number; y: number };
    frameId: string;
    frameStart: { x: number; y: number };
  } | null>(null);
  const lastHighlightCheck = useRef<XYPosition | null>(null);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      frameDrag.current = null;
      lastHighlightCheck.current = null;
      if (!isDraft) return;

      const parentId = draggedNode.parentId;
      if (!parentId?.startsWith("network-")) return;
      // Drilled resources render as standalone cards, so only that card moves.
      if (parentId === drillDownNetworkNodeId) return;
      const frame = reactFlow.getNodes().find((n) => n.id === parentId);
      if (!frame) return;
      frameDrag.current = {
        childId: draggedNode.id,
        childStart: { ...draggedNode.position },
        frameId: frame.id,
        frameStart: { ...frame.position },
      };
      // ReactFlow only elevates the dragged child, never its frame.
      setNodes((prev) =>
        prev.map((n) => (n.id === frame.id ? { ...n, zIndex: 1000 } : n)),
      );
    },
    [isDraft, reactFlow, setNodes, drillDownNetworkNodeId],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (!isDraft) return;

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

      // The highlight branches below intersection-test the whole canvas.
      const last = lastHighlightCheck.current;
      if (
        last &&
        Math.abs(draggedNode.position.x - last.x) < 8 &&
        Math.abs(draggedNode.position.y - last.y) < 8
      ) {
        return;
      }
      lastHighlightCheck.current = { ...draggedNode.position };

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
          // A new array identity per drag tick re-renders the whole canvas.
          return changed ? next : prev;
        });
        return;
      }

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

      const canDrop =
        targetGroup &&
        itemId &&
        (targetGroup.data.group as Group)?.name !== "All" &&
        !groupContainsItem(targetGroup, itemId);

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

      // Clear the highlight first: the branches below return early.
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          if (!n.data.dropTarget) return n;
          changed = true;
          return { ...n, data: { ...n.data, dropTarget: false } };
        });
        return changed ? next : prev;
      });

      // The dropped node settles on top so a peer over a frame paints above it.
      if (!draggedNode.parentId) {
        setNodes((prev) => {
          const z = getTopZIndex(prev);
          return prev.map((n) =>
            n.id === draggedNode.id ? { ...n, zIndex: z } : n,
          );
        });
      }

      // The marker stops useNetworkFrameLayout snapping the card back to its slot.
      if (
        draggedNode.parentId &&
        draggedNode.parentId === drillDownNetworkNodeId
      ) {
        if (!getIntersectingGroup(draggedNode, reactFlow)) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === draggedNode.id
                ? { ...n, data: { ...n.data, drilledFreePos: true } }
                : n,
            ),
          );
          return;
        }
      }

      // Framed resources snap back to their slot and never group-drop.
      const frame = frameDrag.current;
      if (frame && draggedNode.id === frame.childId) {
        frameDrag.current = null;
        setNodes((prev) => {
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

      // A group dropped on a frame keeps its id so policy edges re-attach.
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
              // -1 sorts above every existing child; the frame layout re-sorts.
              position: getFrameChildPosition(-1),
              style: { ...dragged.style, width: NETWORK_FRAME_CHILD_WIDTH },
              // Children inherit the frame's elevation.
              zIndex: undefined,
            };
            const others = prev.filter((n) => n.id !== draggedNode.id);
            // Parents must precede children in the node array.
            const at = others.findIndex((n) => n.id === targetFrame.id) + 1;
            return [...others.slice(0, at), converted, ...others.slice(at)];
          });

          // Carried draft resources join this network; addressless ones stay untracked.
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

      const targetGroup = getIntersectingGroup(draggedNode, reactFlow);
      if (!targetGroup) return;

      const itemId = getDraggedItemId(draggedNode);
      if (!itemId) return;

      const peer =
        (draggedNode.data?.peer as Peer | undefined) ??
        getPlaceholderPeer(draggedNode);
      // getDraftResource guarantees the id and name; raw node data may be blank.
      const resource = draggedNode.id.startsWith("resource-new-")
        ? getDraftResource(draggedNode)
        : (draggedNode.data?.resource as NetworkResource | undefined);

      addMemberToGroup(targetGroup, {
        peer,
        resource,
        itemId,
        draggedNodeId: draggedNode.id,
      });
    },
    [
      isDraft,
      reactFlow,
      setNodes,
      trackCreateResource,
      networkResources,
      assignResourceToNetwork,
      addMemberToGroup,
      drillDownNetworkNodeId,
    ],
  );

  return { onNodeDragStart, onNodeDrag, onNodeDragStop, addMemberToGroup };
}

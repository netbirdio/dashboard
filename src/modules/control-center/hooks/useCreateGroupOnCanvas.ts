import { useReactFlow, XYPosition } from "@xyflow/react";
import { useCallback, useState } from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  draftUid,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_FALLBACK_ROW,
} from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";

type CreateGroupOptions = {
  name: string;
  position: XYPosition;
  peers?: Peer[];
  resources?: NetworkResource[];
  // Their canvas nodes are removed, so the data rides on the group node.
  unassignedDraftResources?: NetworkResource[];
  // Set when grouping inside a drilled network: the group becomes a frame child.
  frameId?: string;
};

export function useCreateGroupOnCanvas() {
  const reactFlow = useReactFlow();
  const { isDraft } = useDraftMode();
  const { trackCreateGroup } = useDraftChangeset();
  const [modalOpen, setModalOpen] = useState(false);

  const createGroup = useCallback(
    async ({
      name,
      position,
      peers,
      resources,
      unassignedDraftResources,
      frameId,
    }: CreateGroupOptions) => {
      const peerIds =
        (peers?.map((p) => p.id).filter(Boolean) as string[]) ?? [];
      const resourceIds =
        (resources?.map((r) => r.id).filter(Boolean) as string[]) ?? [];
      const draftPeers = peers?.filter((p) => p.id?.startsWith("draft-")) ?? [];

      if (isDraft) {
        const group: Group = {
          name,
          peers_count: peerIds.length,
          resources_count: resourceIds.length,
        };
        // The resourcegroup-new- prefix is what the frame's Rename menu checks.
        if (frameId) {
          const nodeId = `resourcegroup-new-${draftUid()}`;
          reactFlow.addNodes({
            id: nodeId,
            type: NodeType.ResourceGroupNode,
            parentId: frameId,
            // drilledFreePos exempts this from the frame's grid slots.
            position,
            style: { width: NETWORK_FRAME_CHILD_WIDTH },
            // Seed dims so a child in a hidden frame doesn't flash unmeasured.
            initialWidth: NETWORK_FRAME_CHILD_WIDTH,
            initialHeight: NETWORK_FRAME_FALLBACK_ROW,
            data: {
              group,
              enabled: true,
              showHandles: false,
              drilledFreePos: true,
              addedMembers: new Set([...peerIds, ...resourceIds]),
              ...(draftPeers.length ? { draftPeers } : {}),
              ...(unassignedDraftResources?.length
                ? { draftResources: unassignedDraftResources }
                : {}),
            },
          });
          trackCreateGroup({ clientId: nodeId, name, peerIds, resourceIds });
          return group;
        }

        const nodeId = `group-new-${draftUid()}`;
        reactFlow.addNodes({
          id: nodeId,
          type: "groupNode",
          data: {
            group,
            enabled: true,
            showHandles: true,
            addedMembers: new Set([...peerIds, ...resourceIds]),
            ...(draftPeers.length ? { draftPeers } : {}),
            ...(unassignedDraftResources?.length
              ? { draftResources: unassignedDraftResources }
              : {}),
          },
          position,
        });
        trackCreateGroup({ clientId: nodeId, name, peerIds, resourceIds });
        return group;
      }
    },
    [reactFlow, isDraft, trackCreateGroup],
  );

  return {
    createGroup,
    modalOpen,
    setModalOpen,
  };
}

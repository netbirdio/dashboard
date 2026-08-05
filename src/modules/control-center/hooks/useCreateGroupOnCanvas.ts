import { useCallback, useState } from "react";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_FALLBACK_ROW,
} from "@/modules/control-center/utils/helpers";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";

type CreateGroupOptions = {
  name: string;
  position: XYPosition;
  peers?: Peer[];
  resources?: NetworkResource[];
  // Grouped UNASSIGNED draft resources — their nodes leave the canvas, so
  // their data rides on the group node (dropping the group into a network
  // frame assigns them to that network).
  unassignedDraftResources?: NetworkResource[];
  // Set when grouping resources INSIDE a drilled network: the group is created
  // as a resourceGroupNode child of this frame (folds into the network) instead
  // of a standalone group node. Draft only.
  frameId?: string;
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useCreateGroupOnCanvas() {
  const reactFlow = useReactFlow();
  const { createOrUpdate } = useGroups();
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
      const peerIds = (peers?.map((p) => p.id).filter(Boolean) as string[]) ?? [];
      const resourceIds =
        (resources?.map((r) => r.id).filter(Boolean) as string[]) ?? [];

      // Draft: no API call — put the group on the canvas and record the change.
      if (isDraft) {
        const group: Group = {
          name,
          peers_count: peerIds.length,
          resources_count: resourceIds.length,
        };
        // Grouping resources inside a drilled network: the group belongs to
        // that network, so create it as a resourceGroupNode child of the frame
        // (folds into it, exactly like a dragged-in / dropped resource group).
        // The resourcegroup-new- id keeps Rename working and matches the frame
        // resource-group menu.
        if (frameId) {
          const nodeId = `resourcegroup-new-${uid()}`;
          reactFlow.addNodes({
            id: nodeId,
            type: NodeType.ResourceGroupNode,
            parentId: frameId,
            // `position` is the frame-relative center of the selection the
            // group replaces; drilledFreePos tells the frame layout to keep it
            // there instead of snapping the freshly added node to the bottom
            // grid slot (the drilled view places children by index).
            position,
            style: { width: NETWORK_FRAME_CHILD_WIDTH },
            // Seed dims so a child added into a drilled (hidden) frame is
            // measured on mount and paints in its slot immediately.
            initialWidth: NETWORK_FRAME_CHILD_WIDTH,
            initialHeight: NETWORK_FRAME_FALLBACK_ROW,
            data: {
              group,
              enabled: true,
              showHandles: false,
              drilledFreePos: true,
              addedMembers: new Set([...peerIds, ...resourceIds]),
              ...(unassignedDraftResources?.length
                ? { draftResources: unassignedDraftResources }
                : {}),
            },
          });
          trackCreateGroup({ clientId: nodeId, name, peerIds, resourceIds });
          return group;
        }

        const nodeId = `group-new-${uid()}`;
        reactFlow.addNodes({
          id: nodeId,
          type: "groupNode",
          data: {
            group,
            enabled: true,
            showHandles: true,
            addedMembers: new Set([...peerIds, ...resourceIds]),
            ...(unassignedDraftResources?.length
              ? { draftResources: unassignedDraftResources }
              : {}),
          },
          position,
        });
        trackCreateGroup({ clientId: nodeId, name, peerIds, resourceIds });
        return group;
      }

      const createdGroup = await createOrUpdate({
        name,
        peers: peerIds,
        resources: resourceIds,
      });

      if (!createdGroup?.id) return undefined;

      reactFlow.addNodes({
        id: `group-${createdGroup.id}`,
        type: "groupNode",
        data: {
          group: createdGroup,
          enabled: true,
          showHandles: false,
        },
        position,
      });

      return createdGroup;
    },
    [createOrUpdate, reactFlow, isDraft, trackCreateGroup],
  );

  return {
    createGroup,
    modalOpen,
    setModalOpen,
  };
}

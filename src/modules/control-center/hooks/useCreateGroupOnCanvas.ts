import { useCallback, useState } from "react";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
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
    }: CreateGroupOptions) => {
      const peerIds = (peers?.map((p) => p.id).filter(Boolean) as string[]) ?? [];
      const resourceIds =
        (resources?.map((r) => r.id).filter(Boolean) as string[]) ?? [];

      // Draft: no API call — put the group on the canvas and record the change.
      if (isDraft) {
        const nodeId = `group-new-${uid()}`;
        const group: Group = {
          name,
          peers_count: peerIds.length,
          resources_count: resourceIds.length,
        };
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

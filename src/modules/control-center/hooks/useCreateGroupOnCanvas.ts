import { useCallback, useState } from "react";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";

type CreateGroupOptions = {
  name: string;
  position: XYPosition;
  peers?: Peer[];
  resources?: NetworkResource[];
};

export function useCreateGroupOnCanvas() {
  const reactFlow = useReactFlow();
  const { createOrUpdate } = useGroups();
  const { isDraft } = useDraftMode();
  const [modalOpen, setModalOpen] = useState(false);

  const createGroup = useCallback(
    async ({ name, position, peers, resources }: CreateGroupOptions) => {
      const createdGroup = await createOrUpdate({
        name,
        peers: peers?.map((p) => p.id).filter(Boolean) as string[] ?? [],
        resources: resources?.map((r) => r.id).filter(Boolean) as string[] ?? [],
      });

      if (!createdGroup?.id) return undefined;

      reactFlow.addNodes({
        id: `group-${createdGroup.id}`,
        type: "groupNode",
        data: {
          group: createdGroup,
          enabled: true,
          showHandles: isDraft,
        },
        position,
      });

      return createdGroup;
    },
    [createOrUpdate, reactFlow, isDraft],
  );

  return {
    createGroup,
    modalOpen,
    setModalOpen,
  };
}

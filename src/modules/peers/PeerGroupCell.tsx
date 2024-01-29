import { notify } from "@components/Notification";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { Group } from "@/interfaces/Group";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

export default function PeerGroupCell() {
  const { peer, peerGroups } = usePeer();
  const [modal, setModal] = useState(false);
  const { mutate } = useSWRConfig();

  const handleSave = async (promises: Promise<Group>[]) => {
    notify({
      title: peer.name,
      description: "Groups of the peer were successfully saved",
      promise: Promise.all(promises).then(() => {
        setModal(false);
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Saving the groups of the peer...",
    });
  };

  const groupIDs = useMemo(() => {
    return peerGroups
      ?.map((group) => group.id)
      .filter((id) => id !== undefined) as string[];
  }, [peerGroups]);

  return (
    <GroupsRow
      label={"Assigned Groups"}
      description={"Use groups to control what this peer can access"}
      groups={groupIDs || []}
      onSave={handleSave}
      modal={modal}
      peer={peer}
      setModal={setModal}
    />
  );
}

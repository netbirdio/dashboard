import { notify } from "@components/Notification";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

export default function PeerGroupCell() {
  const t = useTranslations();
  const { peer, peerGroups } = usePeer();
  const [modal, setModal] = useState(false);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const handleSave = async (promises: Promise<Group>[]) => {
    notify({
      title: peer.name,
      description: t("peers.groupsSaved"),
      promise: Promise.all(promises).then(() => {
        setModal(false);
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t("peers.groupsSaving"),
    });
  };

  const groupIDs = useMemo(() => {
    return peerGroups
      ?.map((group) => {
        if (group?.name === "All") return;
        return group.id;
      })
      .filter((id) => {
        return id !== undefined;
      }) as string[];
  }, [peerGroups]);

  return (
    <GroupsRow
      label={t("peers.assignedGroups")}
      description={t("peers.assignedGroupsDescription")}
      groups={groupIDs || []}
      hideAllGroup={true}
      showAddGroupButton={true}
      disabled={!permission.groups.update}
      onSave={handleSave}
      modal={modal}
      peer={peer}
      setModal={setModal}
      countOnly={true}
    />
  );
}

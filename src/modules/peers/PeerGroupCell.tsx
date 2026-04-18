import { notify } from "@components/Notification";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";
import { useI18n } from "@/i18n/I18nProvider";

export default function PeerGroupCell() {
  const { peer, peerGroups } = usePeer();
  const [modal, setModal] = useState(false);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { t } = useI18n();

  const handleSave = async (promises: Promise<Group>[]) => {
    notify({
      title: peer.name,
      description: t("peerGroupCell.saved"),
      promise: Promise.all(promises).then(() => {
        setModal(false);
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t("peerGroupCell.saving"),
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
      label={t("peerDetails.assignedGroups")}
      description={t("peerDetails.assignedGroupsHelp")}
      groups={groupIDs || []}
      hideAllGroup={true}
      showAddGroupButton={true}
      disabled={!permission.groups.update}
      onSave={handleSave}
      modal={modal}
      peer={peer}
      setModal={setModal}
    />
  );
}

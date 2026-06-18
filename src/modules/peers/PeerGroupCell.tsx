import { notify } from "@components/Notification";
import { useTranslations } from 'next-intl';
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

export default function PeerGroupCell() {
  const t = useTranslations('peers');
  const { peer, peerGroups } = usePeer();
  const [modal, setModal] = useState(false);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const handleSave = async (promises: Promise<Group>[]) => {
    notify({
      title: peer.name,
      description: t('groupsSaved'),
      promise: Promise.all(promises).then(() => {
        setModal(false);
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t('groupsSaving'),
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
      label={t('assignedGroups')}
      description={t('assignedGroupsDescription')}
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

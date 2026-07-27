import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyGroupsCell({ setupKey }: Readonly<Props>) {
  const t = useTranslations("setupKeys");
  const [modal, setModal] = useState(false);
  const { permission } = usePermissions();
  const request = useApiCall<SetupKey>("/setup-keys/" + setupKey.id);
  const { mutate } = useSWRConfig();
  const handleSave = async (promises: Promise<Group>[]) => {
    const groups = await Promise.all(promises);

    notify({
      title: setupKey?.name || t("key"),
      description: t("groupsSavedDescription"),
      promise: request
        .put({
          name: setupKey?.name || t("key"),
          type: setupKey.type,
          expires_in: setupKey.expires_in,
          revoked: setupKey.revoked,
          auto_groups: groups?.map((group) => group.id) || [],
          usage_limit: setupKey.usage_limit,
          ephemeral: setupKey.ephemeral,
          allow_extra_dns_labels: setupKey.allow_extra_dns_labels,
        })
        .then(() => {
          setModal(false);
          mutate("/setup-keys");
          mutate("/groups");
        }),
      loadingMessage: t("groupsSaving"),
    });
  };

  return (
    permission.groups.read && (
      <GroupsRow
        label={t("autoAssignedGroups")}
        description={t("autoAssignedGroupsDescription")}
        groups={setupKey.auto_groups || []}
        onSave={handleSave}
        hideAllGroup={true}
        disabled={!permission.setup_keys.update}
        showAddGroupButton={permission.setup_keys.update}
        modal={modal}
        setModal={setModal}
        countOnly={true}
      />
    )
  );
}

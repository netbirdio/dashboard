import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { Group } from "@/interfaces/Group";
import { SetupKey } from "@/interfaces/SetupKey";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyGroupsCell({ setupKey }: Readonly<Props>) {
  const [modal, setModal] = useState(false);
  const request = useApiCall<SetupKey>("/setup-keys/" + setupKey.id);
  const { mutate } = useSWRConfig();
  const handleSave = async (promises: Promise<Group>[]) => {
    const groups = await Promise.all(promises);

    notify({
      title: setupKey?.name || "Setup Key",
      description: "Groups of the setup key were successfully saved",
      promise: request
        .put({
          name: setupKey?.name || "Setup Key",
          type: setupKey.type,
          expires_in: setupKey.expires_in,
          revoked: setupKey.revoked,
          auto_groups: groups?.map((group) => group.id) || [],
          usage_limit: setupKey.usage_limit,
          ephemeral: setupKey.ephemeral,
        })
        .then(() => {
          setModal(false);
          mutate("/setup-keys");
          mutate("/groups");
        }),
      loadingMessage: "Saving the groups of the setup key...",
    });
  };

  return (
    <GroupsRow
      label={"Auto-assigned Groups"}
      description={
        "These groups will be automatically assigned to peers enrolled with this key"
      }
      groups={setupKey.auto_groups || []}
      onSave={handleSave}
      hideAllGroup={true}
      showAddGroupButton={true}
      modal={modal}
      setModal={setModal}
    />
  );
}

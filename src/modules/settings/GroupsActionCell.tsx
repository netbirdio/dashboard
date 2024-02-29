import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import React, {useMemo} from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { GroupUsage } from "@/modules/settings/useGroupsUsage";
import {ToggleSwitch} from "@components/ToggleSwitch";
import type {Group, GroupPeer} from "@/interfaces/Group";

type Props = {
  group: GroupUsage;
  in_use: boolean;
};
export default function GroupsActionCell({ group, in_use }: Props) {
  const { confirm } = useDialog();
  const deleteRequest = useApiCall<SetupKey>("/groups/" + group.id);
  const { mutate } = useSWRConfig();

  const handleRevoke = async () => {
    notify({
      title: "Group: " + group.name,
      description: "Group was successfully deleted.",
      promise: deleteRequest.del().then(() => {
        mutate("/groups");
      }),
      loadingMessage: "Deleting the group...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${group.name}'?`,
      description:
        "Are you sure you want to delete this group? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <FullTooltip
        content={"Remove dependencies to this group to delete it."}
        interactive={false}
        disabled={!in_use}
      >
        <Button
          variant={"danger-outline"}
          size={"sm"}
          onClick={handleConfirm}
          disabled={in_use}
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </FullTooltip>
    </div>
  );
}

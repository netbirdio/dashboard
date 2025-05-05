import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";
import { GroupUsage } from "@/modules/settings/useGroupsUsage";

type Props = {
  group: GroupUsage;
  in_use: boolean;
};
export default function GroupsActionCell({ group, in_use }: Readonly<Props>) {
  const { permission } = usePermissions();
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

  const { isRegularGroup, isJWTGroup } = useGroupIdentification({
    id: group?.id,
    issued: group?.issued,
  });

  const isDisabled = in_use || !isRegularGroup || !permission.groups.delete;

  const getDisabledText = () => {
    if (isRegularGroup) {
      return "Remove dependencies to this group to delete it.";
    } else if (isJWTGroup) {
      return "This group is issued by JWT and cannot be deleted.";
    } else {
      return "This group is issued by an IdP and cannot be deleted";
    }
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <FullTooltip
        content={<div className={"text-xs max-w-xs"}>{getDisabledText()}</div>}
        interactive={false}
        disabled={!isDisabled}
      >
        <Button
          variant={"danger-outline"}
          size={"sm"}
          onClick={handleConfirm}
          disabled={isDisabled}
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </FullTooltip>
    </div>
  );
}

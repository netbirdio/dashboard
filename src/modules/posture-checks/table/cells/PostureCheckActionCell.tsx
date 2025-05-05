import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckActionCell = ({ check }: Props) => {
  const { permission } = usePermissions();

  const deleteRequest = useApiCall("/posture-checks");
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${check.name}'?`,
      description:
        "Are you sure you want to delete this posture check? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (choice) {
      notify({
        title: check.name,
        description: "Posture check was successfully deleted",
        promise: deleteRequest.del({}, `/${check.id}`).then(() => {
          mutate("/posture-checks").then();
        }),
        loadingMessage: "Deleting posture check...",
      });
    }
  };

  const hasPolicies = check.policies ? check.policies?.length > 0 : false;

  return (
    <div className={"flex justify-end pr-4"}>
      <FullTooltip
        disabled={!hasPolicies}
        content={
          <div className={"text-xs max-w-xs"}>
            This posture check is assigned to a policy and cannot be deleted.
            Please remove the posture check from all policies before deleting
            it.
          </div>
        }
        interactive={false}
      >
        <Button
          variant={"danger-outline"}
          size={"sm"}
          onClick={handleDelete}
          disabled={hasPolicies || !permission.policies.delete}
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </FullTooltip>
    </div>
  );
};

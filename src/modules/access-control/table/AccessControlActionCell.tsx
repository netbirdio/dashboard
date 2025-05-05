import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";

type Props = {
  policy: Policy;
};
export default function AccessControlActionCell({ policy }: Readonly<Props>) {
  const { confirm } = useDialog();
  const policyRequest = useApiCall<Route>("/policies");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const deleteRule = async () => {
    notify({
      title: "Access Control Policy " + policy.name,
      description: "The policy was successfully removed.",
      promise: policyRequest.del("", `/${policy.id}`).then(() => {
        mutate("/policies");
      }),
      loadingMessage: "Deleting the policy...",
    });
  };

  const openConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${policy.name}'?`,
      description:
        "Are you sure you want to delete this access control policy? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    deleteRule().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={openConfirm}
        disabled={!permission.policies.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

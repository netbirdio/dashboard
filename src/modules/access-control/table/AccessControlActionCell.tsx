import Button from "@components/Button";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Policy } from "@/interfaces/Policy";
import { usePolicies } from "@/contexts/PoliciesProvider";

type Props = {
  policy: Policy;
};

export default function AccessControlActionCell({ policy }: Readonly<Props>) {
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const { deletePolicy } = usePolicies();

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
    deletePolicy(policy).then();
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

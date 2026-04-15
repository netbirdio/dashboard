import Button from "@components/Button";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Policy } from "@/interfaces/Policy";
import { useI18n } from "@/i18n/I18nProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";

type Props = {
  policy: Policy;
};

export default function AccessControlActionCell({ policy }: Readonly<Props>) {
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const { deletePolicy } = usePolicies();
  const { t } = useI18n();

  const openConfirm = async () => {
    const choice = await confirm({
      title: t("policies.deleteTitle", { name: policy.name }),
      description: t("policies.deleteDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      type: "danger",
    });
    if (!choice) return;
    await deletePolicy(policy);
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
        {t("actions.delete")}
      </Button>
    </div>
  );
}

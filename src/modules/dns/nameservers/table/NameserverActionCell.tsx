import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverActionCell({ ns }: Readonly<Props>) {
  const { confirm } = useDialog();
  const nsRequest = useApiCall<NameserverGroup>("/dns/nameservers");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { t } = useI18n();

  const deleteRule = async () => {
    notify({
      title: t("nameservers.deleteSuccessTitle", { name: ns.name }),
      description: t("nameservers.deleteSuccessDescription"),
      promise: nsRequest.del("", `/${ns.id}`).then(() => {
        mutate("/dns/nameservers");
      }),
      loadingMessage: t("nameservers.deleting"),
    });
  };

  const openConfirm = async () => {
    const choice = await confirm({
      title: t("nameservers.deleteConfirmTitle", { name: ns.name }),
      description: t("nameservers.deleteConfirmDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
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
        disabled={!permission.nameservers.delete}
      >
        <Trash2 size={16} />
        {t("actions.delete")}
      </Button>
    </div>
  );
}

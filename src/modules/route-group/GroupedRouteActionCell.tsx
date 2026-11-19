import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { GroupedRoute, Route } from "@/interfaces/Route";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteActionCell({ groupedRoute }: Props) {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();

  const handleRevoke = async () => {
    if (!groupedRoute.routes) return Promise.resolve();
    const batch = groupedRoute.routes.map((route) => {
      if (route.id) return routeRequest.del("", `/${route.id}`);
      return Promise.resolve(route);
    });

    notify({
      title: t("routeGroup.deleteTitle", { name: groupedRoute.network_id }),
      description: t("routeGroup.deleted"),
      promise: Promise.all(batch).then(() => {
        mutate("/routes");
      }),
      loadingMessage: t("routeGroup.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("routeGroup.confirmDeleteTitle", {
        name: groupedRoute.network_id,
      }),
      description: t("routeGroup.confirmDeleteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
        disabled={!permission.routes.delete}
      >
        <Trash2 size={16} />
        {t("common.delete")}
      </Button>
    </div>
  );
}

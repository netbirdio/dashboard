import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { PenSquare, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Route } from "@/interfaces/Route";
import RouteUpdateModal from "@/modules/routes/RouteUpdateModal";

type Props = {
  route: Route;
};
export default function RouteActionCell({ route }: Props) {
  const { t } = useI18n();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();
  const [editModal, setEditModal] = useState(false);

  const handleRevoke = async () => {
    notify({
      title: t("peerRouteActions.deleteTitle", { name: route.network_id }),
      description: t("peerRouteActions.deleted"),
      promise: routeRequest.del("", `/${route.id}`).then(() => {
        mutate("/routes");
      }),
      loadingMessage: t("peerRouteActions.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("routeActions.confirmDeleteTitle", { name: route.network_id }),
      description: t("routeActions.confirmDeleteDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      {editModal && (
        <RouteUpdateModal
          route={route}
          open={editModal}
          onOpenChange={setEditModal}
        />
      )}
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => setEditModal(true)}
        disabled={!permission.routes.update}
      >
        <PenSquare size={16} />
        {t("actions.edit")}
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
        disabled={!permission.routes.delete}
      >
        <Trash2 size={16} />
        {t("actions.delete")}
      </Button>
    </div>
  );
}

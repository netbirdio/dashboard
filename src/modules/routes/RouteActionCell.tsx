import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { MoreVertical, PowerIcon, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Route } from "@/interfaces/Route";
import RouteUpdateModal from "@/modules/routes/RouteUpdateModal";

type Props = {
  route: Route;
};
export default function RouteActionCell({ route }: Props) {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();
  const { updateRoute } = useRoutes();
  const [editModal, setEditModal] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRevoke = async () => {
    notify({
      title: t("routes.deleteTitle", { name: route.network_id }),
      description: t("routes.deleted"),
      promise: routeRequest.del("", `/${route.id}`).then(() => {
        mutate("/routes");
      }),
      loadingMessage: t("routes.deleting"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("routes.confirmDeleteTitle", { name: route.network_id }),
      description: t("routes.confirmDeleteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  const toggleEnabled = () => {
    const nextEnabled = !route.enabled;
    updateRoute(
      route,
      { enabled: nextEnabled },
      () => {
        mutate("/routes");
      },
      nextEnabled ? t("routes.enabled") : t("routes.disabled"),
    );
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
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!permission.routes.update && !permission.routes.delete}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={!permission.routes.update && !permission.routes.delete}
            aria-label={t("routes.routeActionsLabel")}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => setEditModal(true)}
            disabled={!permission.routes.update}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              {t("common.edit")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              toggleEnabled();
            }}
            disabled={!permission.routes.update}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {route.enabled ? t("common.disable") : t("common.enable")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleConfirm}
            variant={"danger"}
            disabled={!permission.routes.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {t("common.delete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

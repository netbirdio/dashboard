"use client";

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
import {
  MoreVertical,
  PowerIcon,
  SquarePenIcon,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useTranslations } from "next-intl";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";
import RouteUpdateModal from "@/modules/routes/RouteUpdateModal";

type Props = {
  route: Route;
};
export default function RouteActionCell({ route }: Props) {
  const t = useTranslations("routes");
  const tCommon = useTranslations("common");
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();
  const { updateRoute } = useRoutes();
  const [editModal, setEditModal] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRevoke = async () => {
    notify({
      title: t("deleteRouteNotify", { network_id: route.network_id }),
      description: t("routeRemoved"),
      promise: routeRequest.del("", `/${route.id}`).then(() => {
        mutate("/routes");
      }),
      loadingMessage: t("deletingRoute"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("deleteDialogTitle", { name: route.network_id }),
      description: t("deleteDialogDescription"),
      confirmText: t("deleteDialogConfirm"),
      cancelText: tCommon("cancel"),
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
      nextEnabled
        ? t("routeEnabledSuccess")
        : t("routeDisabledSuccess"),
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
            aria-label={t("routeActionsLabel")}
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
              {t("actionEdit")}
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
              {route.enabled ? t("actionDisable") : t("actionEnable")}
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
              {t("actionDelete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

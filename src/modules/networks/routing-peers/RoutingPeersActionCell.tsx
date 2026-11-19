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
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  router: NetworkRouter;
};
export const RoutingPeersActionCell = ({ router }: Props) => {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { deleteRouter, network, openAddRoutingPeerModal } =
    useNetworksContext();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const toggleEnabled = async () => {
    const nextEnabled = !router.enabled;
    notify({
      title: t("networks.networkRoutingPeer"),
      description: t(
        nextEnabled
          ? "networks.routingPeerNowEnabled"
          : "networks.routingPeerNowDisabled",
      ),
      loadingMessage: t("networks.updatingRoutingPeer"),
      duration: 1200,
      promise: update({
        ...router,
        enabled: nextEnabled,
      }).then(() => {
        mutate(`/networks/${network?.id}/routers`);
      }),
    });
  };

  return (
    <div className={"flex justify-end"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!permission.networks.update && !permission.networks.delete}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={
              !permission.networks.update && !permission.networks.delete
            }
            aria-label={t("networks.routingPeerActions")}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              openAddRoutingPeerModal(network, router);
            }}
            disabled={!permission.networks.update}
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
            disabled={!permission.networks.update}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {router.enabled ? t("common.disable") : t("common.enable")}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              deleteRouter(network, router);
            }}
            variant={"danger"}
            disabled={!permission.networks.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {t("common.remove")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

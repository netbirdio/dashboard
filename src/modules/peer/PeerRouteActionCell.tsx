import Button from "@components/Button";
import { notify } from "@components/Notification";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeer } from "@/contexts/PeerProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function PeerRouteActionCell({ route }: Props) {
  const t = useTranslations();
  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();
  const { peer } = usePeer();
  const { groups } = useGroups();

  const peerGroup = useMemo(() => {
    if (!groups) return undefined;
    return groups.find((group) => {
      const id = route.peer_groups && route.peer_groups[0];
      return group.id === id;
    });
  }, [route, groups]);

  const handleRevoke = async () => {
    notify({
      title: t("peer.deleteRouteTitle", { id: route.network_id }),
      description: t("peer.routeRemoved"),
      promise: routeRequest.del("", `/${route.id}`).then(() => {
        mutate("/routes");
      }),
      loadingMessage: t("peer.deletingRoute"),
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: t("peer.deletePeerFromRouteTitle", {
        peer: peer.name,
        network: route.network_id,
      }),
      description: t("peer.deletePeerFromRouteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <TooltipProvider delayDuration={0} disableHoverableContent={true}>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              variant={"danger-outline"}
              size={"sm"}
              onClick={handleConfirm}
              disabled={!!peerGroup}
            >
              <Trash2 size={16} />
              {t("common.delete")}
            </Button>
          </TooltipTrigger>
          {peerGroup && (
            <TooltipContent>
              <div className={"max-w-xs text-sm"}>
                {t.rich("peer.peerInRouteGroup", {
                  name: peer.name,
                  peer: (chunks) => (
                    <span className={"text-netbird"}>{chunks}</span>
                  ),
                })}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

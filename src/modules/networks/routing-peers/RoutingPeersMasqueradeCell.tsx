import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { NetworkRouter } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { RoutingPeerMasqueradeTooltip } from "@/modules/networks/routing-peers/RoutingPeerMasqueradeSwitch";

type Props = {
  router: NetworkRouter;
};
export const RoutingPeersMasqueradeCell = ({ router }: Props) => {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const isRoutingPeer = router.peer != "";

  const { data: peer, isLoading } = useFetchApi<Peer>(
    "/peers/" + router.peer,
    true,
    false,
    isRoutingPeer,
  );

  const isNonLinuxRoutingPeer = useMemo(() => {
    if (!peer) return false;
    return getOperatingSystem(peer.os) != OperatingSystem.LINUX;
  }, [peer]);

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const toggle = async (enabled: boolean) => {
    notify({
      title: t("networks.networkRoutingPeer"),
      description: t(
        enabled
          ? "networks.masqueradeNowEnabled"
          : "networks.masqueradeNowDisabled",
      ),
      loadingMessage: t("networks.updatingMasquerade"),
      promise: update({
        ...router,
        masquerade: enabled,
      }).then(() => {
        mutate(`/networks/${network?.id}/routers`);
      }),
    });
  };

  const isChecked = useMemo(() => {
    return router.masquerade;
  }, [router]);

  const isToggleDisabled =
    isLoading ||
    (isRoutingPeer && isNonLinuxRoutingPeer) ||
    !permission.networks.update;

  return (
    <div className={"flex"}>
      <RoutingPeerMasqueradeTooltip show={isToggleDisabled}>
        <ToggleSwitch
          disabled={isToggleDisabled}
          checked={isChecked}
          size={"small"}
          onClick={() => toggle(!isChecked)}
        />
      </RoutingPeerMasqueradeTooltip>
    </div>
  );
};

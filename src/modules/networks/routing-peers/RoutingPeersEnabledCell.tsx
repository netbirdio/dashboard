import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  router: NetworkRouter;
};
export const RoutingPeersEnabledCell = ({ router }: Props) => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const toggle = async (enabled: boolean) => {
    notify({
      title: "Network Routing Peer",
      description: `Routing peer is now ${enabled ? "enabled" : "disabled"}`,
      loadingMessage: "Updating routing peer...",
      promise: update({
        ...router,
        enabled,
      }).then(() => {
        mutate(`/networks/${network?.id}/routers`);
      }),
    });
  };

  const isChecked = useMemo(() => {
    return router.enabled;
  }, [router]);

  return (
    <div className={"flex"}>
      <ToggleSwitch
        checked={isChecked}
        size={"small"}
        onClick={() => toggle(!isChecked)}
        disabled={!permission.networks.update}
      />
    </div>
  );
};

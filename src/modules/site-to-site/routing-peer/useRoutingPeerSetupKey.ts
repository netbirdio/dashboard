import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { Group } from "@/interfaces/Group";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { SetupKey } from "@/interfaces/SetupKey";
import { groupPeerIds } from "@/modules/site-to-site/routing-peer/routingPeerDeploy";
import { routingPeerGroupName } from "@/modules/site-to-site/siteToSite";

/**
 * Makes a one-off setup key whose peer joins the network's routing peer
 * group, routing the network through that group first. The group and router
 * are reused, so preparing twice adds nothing twice.
 */
export const useRoutingPeerSetupKey = (network?: Network) => {
  const { mutate } = useSWRConfig();
  const [setupKey, setSetupKey] = useState("");
  const [group, setGroup] = useState<Group>();
  const [knownPeerIds, setKnownPeerIds] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  const groupRequest = useApiCall<Group>("/groups", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const { data: groups } = useFetchApi<Group[]>("/groups");

  const prepare = useCallback(async () => {
    if (!network) return;
    setIsPreparing(true);
    const promise = (async () => {
      const groupName = routingPeerGroupName(network);
      const routingGroup =
        groups?.find((g) => g.name === groupName) ??
        (await groupRequest.post({ name: groupName }));

      const routers = (await routerRequest.get(
        `/${network.id}/routers`,
      )) as unknown as NetworkRouter[];
      const routesThroughGroup = routers?.some((r) =>
        r.peer_groups?.includes(routingGroup.id as string),
      );
      if (!routesThroughGroup) {
        await routerRequest.post(
          {
            peer_groups: [routingGroup.id],
            metric: 9999,
            masquerade: true,
            enabled: true,
          },
          `/${network.id}/routers`,
        );
      }

      const key = await setupKeyRequest.post({
        name: `Routing peer for ${network.name}`,
        type: "one-off",
        expires_in: 24 * 60 * 60,
        revoked: false,
        auto_groups: [routingGroup.id],
        usage_limit: 1,
        ephemeral: false,
        allow_extra_dns_labels: false,
      });

      setGroup(routingGroup);
      setKnownPeerIds(groupPeerIds(routingGroup));
      setSetupKey(key.key);
      mutate("/setup-keys");
      mutate("/groups");
      mutate("/networks");
      mutate("/networks/routers");
      mutate(`/networks/${network.id}/routers`);
    })().finally(() => setIsPreparing(false));

    notify({
      title: "Routing Peer",
      description: "Failed to prepare the routing peer setup key",
      promise,
      loadingMessage: "Preparing setup key...",
      showOnlyError: true,
      preventSuccessToast: true,
    });
    return promise;
  }, [network, groups, groupRequest, routerRequest, setupKeyRequest, mutate]);

  const reset = useCallback(() => {
    setSetupKey("");
    setGroup(undefined);
    setKnownPeerIds([]);
  }, []);

  return { setupKey, group, knownPeerIds, isPreparing, prepare, reset };
};

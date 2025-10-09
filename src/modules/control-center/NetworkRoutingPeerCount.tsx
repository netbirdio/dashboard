import Button from "@components/Button";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";

type Props = {
  network: Network;
};

export const NetworkRoutingPeerCount = ({ network }: Props) => {
  const { data: routers, isLoading: isRoutersLoading } =
    useFetchApi<NetworkRouter[]>("/networks/routers");
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");

  const routingPeerStatusColor = useMemo(() => {
    if (!network) return "bg-nb-gray-500";
    const routerCount = network.routers?.length || 0;
    if (routerCount === 0) return "bg-nb-gray-500";
    if (routerCount === 1) return "bg-yellow-400";
    if (routerCount > 1) return "bg-green-400";
    return "bg-nb-gray-500";
  }, [network]);

  const networkRouters = useMemo(() => {
    if (!network || !peers) return [];
    const routerIds = network?.routers?.map((r) => r) || [];
    return routers?.filter((r) => routerIds.includes(r.id)) || [];
  }, [network, peers, routers]);

  return (
    <Button
      variant={"secondary"}
      size={"xs"}
      className={"!bg-nb-gray-930 !text-nb-gray-300 cursor-default"}
    >
      <CircleIcon
        size={8}
        className={cn("shrink-0 block", routingPeerStatusColor)}
      />
      {network.routers?.length || 0} Routing Peer(s)
    </Button>
  );
};

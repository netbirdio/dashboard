import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Network } from "@/interfaces/Network";

type Props = {
  network: Network;
};

export const NetworkRoutingPeerCount = ({ network }: Props) => {
  const router = useRouter();
  const routerCount = network?.routing_peers_count ?? 0;

  const routingPeerStatusColor = useMemo(() => {
    if (!network) return "bg-nb-gray-500";
    if (routerCount === 0) return "bg-nb-gray-500";
    if (routerCount === 1) return "bg-yellow-400";
    if (routerCount > 1) return "bg-green-400";
    return "bg-nb-gray-500";
  }, [network, routerCount]);

  const openNetworkPage = () => {
    router.push(`/network?id=${network.id}#routing-peers`);
  };

  return (
    <Button variant={"secondary"} size={"xs"} onClick={openNetworkPage}>
      <CircleIcon
        size={8}
        className={cn("shrink-0 block", routingPeerStatusColor)}
      />
      {routerCount} Routing Peer(s)
    </Button>
  );
};

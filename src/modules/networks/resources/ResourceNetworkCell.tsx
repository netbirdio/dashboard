import Badge from "@components/Badge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { NetworkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import { NoRoutingPeerBadge } from "@/modules/networks/misc/NoRoutingPeerBadge";

type Props = {
  network: Network;
};

export const ResourceNetworkCell = ({ network }: Props) => {
  const router = useRouter();

  return (
    <div className={"flex gap-3"}>
      <Badge
        variant={"gray"}
        useHover={true}
        className={"cursor-pointer min-h-[34px] font-medium"}
        data-testid={"resource-network"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/network?id=${network.id}`);
        }}
      >
        <NetworkIcon size={12} className={"shrink-0"} />
        <TextWithTooltip text={network.name} maxChars={25} />
      </Badge>
      {!network.routing_peers_count && <NoRoutingPeerBadge network={network} />}
    </div>
  );
};

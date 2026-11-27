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
      {!network.routing_peers_count && <NoRoutingPeerBadge network={network} />}
      {/* A button, so the network can be reached and opened by keyboard. */}
      <button
        type={"button"}
        className={"rounded-md"}
        aria-label={`Open network ${network.name}`}
        data-testid={"resource-network"}
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/network?id=${network.id}`);
        }}
      >
        <Badge
          variant={"gray"}
          useHover={true}
          className={"min-h-[34px] font-medium"}
        >
          <NetworkIcon size={12} className={"shrink-0"} />
          <TextWithTooltip text={network.name} maxChars={25} />
        </Badge>
      </button>
    </div>
  );
};

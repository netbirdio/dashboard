import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};
export default function NetworkRoutingPeerCell({ network }: Props) {
  const { permission } = usePermissions();
  const router = useRouter();
  const disabledText = useMemo(
    () => (
      <>
        High availability is currently{" "}
        <span className={"text-yellow-400 font-medium"}>inactive</span> for this
        network.
      </>
    ),
    [],
  );

  const enabledText = useMemo(
    () => (
      <>
        High availability is{" "}
        <span className={"text-green-500 font-medium"}>active</span> for this
        network.
      </>
    ),
    [],
  );

  const { openAddRoutingPeerModal } = useNetworksContext();

  const isHighlyAvailable = !!(
    network?.routing_peers_count && network.routing_peers_count >= 2
  );
  const isActive = !!(
    network?.routing_peers_count && network.routing_peers_count > 0
  );

  return (
    <div className={"flex gap-3 items-center"}>
      <FullTooltip
        interactive={false}
        content={
          <div className={"max-w-xs text-xs"}>
            <>
              {isHighlyAvailable ? enabledText : disabledText}
              {isHighlyAvailable ? (
                <div className={"inline-flex mt-2"}>
                  You can add more routing peers to increase the availability of
                  this network.
                </div>
              ) : (
                <div className={"inline-flex mt-2"}>
                  Go ahead and add more routing peers or groups with routing
                  peers to enable high availability for this network.
                </div>
              )}
            </>
          </div>
        }
      >
        {isActive && (
          <Badge
            variant={isHighlyAvailable ? "green" : "gray"}
            className={cn(
              "inline-flex gap-2  min-w-[110px] font-medium items-center justify-center min-h-[34px] cursor-pointer",
            )}
            onClick={() =>
              router.push(`/network?id=${network.id}&tab=routing-peers`)
            }
            useHover={true}
          >
            <>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isHighlyAvailable ? "bg-green-500" : "bg-yellow-400",
                )}
              ></div>
              {network?.routing_peers_count && network.routing_peers_count}{" "}
              Peer(s)
            </>

            <HelpCircle size={12} />
          </Badge>
        )}
      </FullTooltip>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"min-w-[130px]"}
        onClick={() => openAddRoutingPeerModal(network)}
        disabled={!permission.networks.update}
      >
        <PlusCircle size={12} />
        Add Routing Peer
      </Button>
    </div>
  );
}

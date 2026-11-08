"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("networks");
  const tCommon = useTranslations("common");
  const { permission } = usePermissions();
  const router = useRouter();

  const { openAddRoutingPeerModal } = useNetworksContext();

  const isHighlyAvailable = !!(
    network?.routing_peers_count && network.routing_peers_count >= 2
  );
  const isActive = !!(
    network?.routing_peers_count && network.routing_peers_count > 0
  );

  const statusLabel = isHighlyAvailable ? tCommon("active") : tCommon("inactive");
  const tooltipText = isHighlyAvailable
    ? t("highAvailabilityActiveText", { status: statusLabel })
    : t("highAvailabilityInactiveText", { status: statusLabel });
  const helpText = isHighlyAvailable
    ? t("highAvailabilityHelpActive")
    : t("highAvailabilityHelpInactive");

  return (
    <div className={"flex gap-3 items-center"}>
      <FullTooltip
        interactive={false}
        content={
          <div className={"max-w-xs text-xs"}>
            <div>{tooltipText}</div>
            <div className={"inline-flex mt-2"}>{helpText}</div>
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
              {t("peerCount", { count: network?.routing_peers_count ?? 0 })}
            </>

            <HelpCircle size={12} />
          </Badge>
        )}
      </FullTooltip>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"!px-3"}
        onClick={() => openAddRoutingPeerModal(network)}
        disabled={!permission.networks.update}
        aria-label={t("addRoutingPeer")}
      >
        <PlusCircle size={12} />
        {t("addRoutingPeerBtn")}
      </Button>
    </div>
  );
}

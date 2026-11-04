"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import PeerIcon from "@/assets/icons/PeerIcon";
import { GroupedRoute } from "@/interfaces/Route";
import { useAddRoutingPeer } from "@/modules/routes/RouteAddRoutingPeerProvider";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteHighAvailabilityCell({
  groupedRoute,
}: Props) {
  const t = useTranslations("routes");
  const router = useRouter();
  const isActive = useMemo(() => {
    return groupedRoute.high_availability_count > 1;
  }, [groupedRoute.high_availability_count]);

  const disabledText = useMemo(
    () => (
      <>
        {t("haDisabled")}
      </>
    ),
    [t],
  );

  const enabledText = useMemo(
    () => (
      <>
        {t("haEnabled")}
      </>
    ),
    [t],
  );

  const { openAddRoutingPeerModal } = useAddRoutingPeer();

  return (
    <FullTooltip
      interactive={false}
      content={
        <div className={"max-w-xs text-xs"}>
          {!isActive && !groupedRoute.is_using_route_groups && (
            <>
              {disabledText}
              <div className={"inline-flex mt-2"}>
                {t("haAddMorePeersTooltip")}
              </div>
            </>
          )}
          {isActive && !groupedRoute.is_using_route_groups && (
            <>
              {enabledText}
              <div className={"inline-flex mt-2"}>
                {t("haIncreasePeersTooltip")}
              </div>
            </>
          )}
          {!isActive && groupedRoute.is_using_route_groups && (
            <>
              {disabledText}
              <div className={"inline-flex mt-2"}>
                {t("haAddToGroupTooltip")}
              </div>
            </>
          )}
          {isActive && groupedRoute.is_using_route_groups && (
            <>
              {enabledText}
              <div className={"inline-flex mt-2"}>
                {t("haAddFromPeersTooltip")}
              </div>
            </>
          )}
        </div>
      }
    >
      <div className={"flex gap-3 items-center"}>
        <Badge
          variant={isActive ? "green" : "gray"}
          className={cn(
            "inline-flex gap-2  min-w-[110px] font-medium items-center justify-center min-h-[34px]",
            !isActive && "opacity-30",
          )}
          useHover={true}
        >
          {isActive ? (
            <>
              <div className={"h-2 w-2 rounded-full bg-green-500"}></div>
              {t("haPeerCount", { count: groupedRoute.high_availability_count })}
            </>
          ) : (
            <>
              <div className={"h-2 w-2 rounded-full bg-nb-gray-700"}></div>
              {t("haDisabledBadge")}
            </>
          )}
          <HelpCircle size={12} />
        </Badge>
        {groupedRoute.is_using_route_groups && (
          <Button
            size={"xs"}
            variant={"secondary"}
            className={"min-w-[130px]"}
            onClick={() => router.push("/peers")}
          >
            <>
              <PeerIcon size={12} />
              {t("goToPeers")}
            </>
          </Button>
        )}
        {!groupedRoute.is_using_route_groups && (
          <Button
            size={"xs"}
            variant={"secondary"}
            className={"min-w-[130px]"}
            onClick={() => openAddRoutingPeerModal(groupedRoute)}
          >
            <PlusCircle size={12} />
            {t("addPeer")}
          </Button>
        )}{" "}
      </div>
    </FullTooltip>
  );
}

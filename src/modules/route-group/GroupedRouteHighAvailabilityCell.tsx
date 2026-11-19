import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { GroupedRoute } from "@/interfaces/Route";
import { useAddRoutingPeer } from "@/modules/routes/RouteAddRoutingPeerProvider";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteHighAvailabilityCell({
  groupedRoute,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const isActive = useMemo(() => {
    return groupedRoute.high_availability_count > 1;
  }, [groupedRoute.high_availability_count]);

  const disabledText = useMemo(
    () => (
      <>
        High availability is currently{" "}
        <span className={"text-red-500 font-medium"}>disabled</span> for this
        route.
      </>
    ),
    [],
  );

  const enabledText = useMemo(
    () => (
      <>
        High availability is{" "}
        <span className={"text-green-500 font-medium"}>enabled</span> for this
        route.
      </>
    ),
    [],
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
                {t("routeGroup.haAddMorePeersTooltip")}
              </div>
            </>
          )}
          {isActive && !groupedRoute.is_using_route_groups && (
            <>
              {enabledText}
              <div className={"inline-flex mt-2"}>
                {t("routeGroup.haIncreasePeersTooltip")}
              </div>
            </>
          )}
          {!isActive && groupedRoute.is_using_route_groups && (
            <>
              {disabledText}
              <div className={"inline-flex mt-2"}>
                {t("routeGroup.haAddToGroupTooltip")}
              </div>
            </>
          )}
          {isActive && groupedRoute.is_using_route_groups && (
            <>
              {enabledText}
              <div className={"inline-flex mt-2"}>
                {t("routeGroup.haAddFromPeersTooltip")}
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
              {groupedRoute.high_availability_count}{" " + t("routeGroup.usageLimitSuffix")}
            </>
          ) : (
            <>
              <div className={"h-2 w-2 rounded-full bg-nb-gray-700"}></div>
              {t("common.disabled")}
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
              {t("routeGroup.goToPeers")}
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
            {t("common.addPeer")}
          </Button>
        )}{" "}
      </div>
    </FullTooltip>
  );
}

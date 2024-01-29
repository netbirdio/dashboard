import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo, useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { GroupedRoute } from "@/interfaces/Route";
import RouteAddRoutingPeerModal from "@/modules/routes/RouteAddRoutingPeerModal";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteHighAvailabilityCell({
  groupedRoute,
}: Props) {
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

  const [modal, setModal] = useState(false);

  return (
    <>
      {!groupedRoute.is_using_route_groups && (
        <RouteAddRoutingPeerModal
          groupedRoute={groupedRoute}
          modal={modal}
          setModal={setModal}
        />
      )}

      <FullTooltip
        interactive={false}
        content={
          <div className={"max-w-xs text-xs"}>
            {!isActive && !groupedRoute.is_using_route_groups && (
              <>
                {disabledText}
                <div className={"inline-flex mt-2"}>
                  Go ahead and add more routing peers to enable high
                  availability for this network route.
                </div>
              </>
            )}
            {isActive && !groupedRoute.is_using_route_groups && (
              <>
                {enabledText}
                <div className={"inline-flex mt-2"}>
                  You can add more peers to increase the availability of this
                  network route.
                </div>
              </>
            )}
            {!isActive && groupedRoute.is_using_route_groups && (
              <>
                {disabledText}
                <div className={"inline-flex mt-2"}>
                  To configure, you must add more peers to a group in this
                  route. You can do it in the Peers menu.
                </div>
              </>
            )}
            {isActive && groupedRoute.is_using_route_groups && (
              <>
                {enabledText}
                <div className={"inline-flex mt-2"}>
                  You can add more peers to a group in this route by going to
                  the peers page.
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
                {groupedRoute.high_availability_count} Peer(s)
              </>
            ) : (
              <>
                <div className={"h-2 w-2 rounded-full bg-nb-gray-700"}></div>
                Disabled
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
                Go to Peers
              </>
            </Button>
          )}
          {!groupedRoute.is_using_route_groups && (
            <Button
              size={"xs"}
              variant={"secondary"}
              className={"min-w-[130px]"}
              onClick={() => setModal(true)}
            >
              <PlusCircle size={12} />
              Add Peer
            </Button>
          )}{" "}
        </div>
      </FullTooltip>
    </>
  );
}

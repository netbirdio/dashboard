import Badge from "@components/Badge";
import { MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";
import { GroupedRoute } from "@/interfaces/Route";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteRoutingPeers({ groupedRoute }: Props) {
  return (
    <div className={"flex gap-3 items-center"}>
      <Badge
        variant={groupedRoute.high_availability_count > 1 ? "green" : "gray"}
        className={"px-3 gap-2 whitespace-nowrap"}
      >
        <MonitorSmartphoneIcon size={12} />
        {groupedRoute.high_availability_count} Peer(s)
      </Badge>
    </div>
  );
}

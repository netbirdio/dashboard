import Badge from "@components/Badge";
import GroupBadge from "@components/ui/GroupBadge";
import { MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { GroupedRoute } from "@/interfaces/Route";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteTypeCell({ groupedRoute }: Props) {
  const { groups } = useGroups();

  const group = useMemo(() => {
    const firstRoute = groupedRoute.routes && groupedRoute.routes[0];
    if (!firstRoute) return undefined;
    const peerGroups = firstRoute.peer_groups;
    if (!peerGroups) return undefined;
    return groups?.find((g) => g.id === peerGroups[0]);
  }, [groupedRoute.routes, groups]);

  return (
    <div className={"inline-flex"}>
      {group ? (
        <GroupBadge group={group} />
      ) : (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <MonitorSmartphoneIcon size={14} /> Routing Peers
        </Badge>
      )}
    </div>
  );
}

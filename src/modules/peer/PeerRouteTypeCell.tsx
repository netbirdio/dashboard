import Badge from "@components/Badge";
import GroupBadge from "@components/ui/GroupBadge";
import { MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function PeerRouteTypeCell({ route }: Props) {
  const { groups } = useGroups();

  const peerGroup = useMemo(() => {
    if (!groups) return undefined;
    return groups.find((group) => {
      const id = route.peer_groups && route.peer_groups[0];
      return group.id === id;
    });
  }, [route, groups]);

  return (
    <div className={"inline-flex"}>
      {!peerGroup ? (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <MonitorSmartphoneIcon size={14} /> Routing Peer
        </Badge>
      ) : (
        <GroupBadge group={peerGroup} />
      )}
    </div>
  );
}

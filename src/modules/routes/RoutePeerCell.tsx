import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import GroupBadge from "@components/ui/GroupBadge";
import PeerBadge from "@components/ui/PeerBadge";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { Route } from "@/interfaces/Route";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  route: Route;
};
export default function RoutePeerCell({ route }: Props) {
  const { peers } = usePeers();
  const { groups } = useGroups();

  const peer = useMemo(() => {
    return peers?.find((p) => p.id === route.peer);
  }, [peers, route.peer]);

  const group = useMemo(() => {
    return groups?.find((g) => {
      if (route.peer_groups && route.peer_groups.length > 0) {
        return g.id === route.peer_groups[0];
      } else {
        return false;
      }
    });
  }, [groups, route.peer_groups]);

  return (
    <div className={"flex items-center gap-2 max-w-[295px] min-w-[295px]"}>
      {peer && (
        <ActiveInactiveRow
          active={peer.connected}
          inactiveDot={"gray"}
          text={peer.name}
        >
          <DescriptionWithTooltip className={"mt-1"} text={route.description} />
        </ActiveInactiveRow>
      )}

      {group && (
        <>
          <GroupBadge group={group} />
          <ArrowRightIcon size={14} className={"shrink-0"} />
          <PeerBadge> {group.peers_count} Peer(s)</PeerBadge>
        </>
      )}
    </div>
  );
}

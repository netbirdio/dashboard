import GroupBadge from "@components/ui/GroupBadge";
import PeerCountBadge from "@components/ui/PeerCountBadge";
import useFetchApi from "@utils/api";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { useGroups } from "@/contexts/GroupsProvider";
import { NetworkRouter } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import PeerNameCell from "@/modules/peers/PeerNameCell";

type Props = {
  router: NetworkRouter;
};
export const NetworkRoutingPeerName = ({ router }: Props) => {
  const { groups, isLoading: isGroupsLoading } = useGroups();
  const isRoutingPeer = router.peer != "";

  const { data: peer, isLoading } = useFetchApi<Peer>(
    "/peers/" + router.peer,
    true,
    false,
    isRoutingPeer,
  );

  const routingPeerGroup = useMemo(() => {
    return groups?.find((g) => {
      if (router.peer_groups && router.peer_groups.length > 0) {
        return g.id === router.peer_groups[0];
      } else {
        return false;
      }
    });
  }, [groups, router.peer_groups]);

  if (isLoading || isGroupsLoading) {
    return <Skeleton height={36} />;
  }

  if (isRoutingPeer && peer) {
    return <PeerNameCell peer={peer} />;
  }

  if (routingPeerGroup) {
    return (
      <div className={"flex items-center gap-2 max-w-[295px] min-w-[295px]"}>
        <GroupBadge
          group={routingPeerGroup}
          redirectToGroupPage={true}
          redirectGroupTab={"peers"}
        />
        <ArrowRightIcon size={14} className={"shrink-0"} />
        <PeerCountBadge group={routingPeerGroup} />
      </div>
    );
  }
};

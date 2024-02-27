import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { usePeerGroups } from "@/contexts/PeerProvider";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";

type Props = {
  peer: Peer;
};
export default function usePeerRoutes({ peer }: Props) {
  const { data: routes } = useFetchApi<Route[]>("/routes");
  const { peerGroups } = usePeerGroups(peer);

  return useMemo(() => {
    if (!routes) return undefined;
    return routes.filter((route) => {
      const foundPeer = route.peer === peer.id;
      if (foundPeer) return true;
      const peerGroupIds = peerGroups
        ?.map((g) => g.id)
        .filter((id) => id != undefined) as string[];
      return route.peer_groups
        ? peerGroupIds.includes(route.peer_groups[0])
        : false;
    });
  }, [routes, peer.id, peerGroups]);
}

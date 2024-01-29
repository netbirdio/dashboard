import { forEach } from "lodash";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import type { GroupedRoute, Route } from "@/interfaces/Route";

type Props = {
  routes?: Route[];
};
export default function useGroupedRoutes({ routes }: Props) {
  const { groups } = useGroups();

  return useMemo(() => {
    if (!routes) return undefined;
    const results: GroupedRoute[] = [];

    const grouped = routes.reduce(
      (acc, route) => {
        const key = `${route.network_id}-${route.network}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(route);
        return acc;
      },
      {} as Record<string, Route[]>,
    );

    forEach(grouped, (routes, id) => {
      const groupPeerRoute = routes.find(
        (r) => r.peer_groups && r.peer_groups?.length > 0,
      );

      const peerRoutes = routes.filter(
        (r) => r.peer && r.peer_groups == undefined,
      );

      const countPeersOfGroup = groupPeerRoute?.enabled
        ? groups?.find((g) => g.id == groupPeerRoute?.peer_groups?.[0])
            ?.peers_count || 0
        : 0;
      const countEnabledPeers = peerRoutes.filter((r) => r.enabled).length;
      const allPeers = countPeersOfGroup + countEnabledPeers;

      results.push({
        id,
        enabled: routes.find((r) => r.enabled) != undefined,
        network: routes[0].network,
        network_id: routes[0].network_id,
        high_availability_count: allPeers,
        is_using_route_groups: !!groupPeerRoute,
        description: groupPeerRoute ? groupPeerRoute?.description : undefined,
        routes: routes,
      });
    });
    return results;
  }, [routes, groups]);
}

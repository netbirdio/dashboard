import useFetchApi from "@utils/api";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { usePeers } from "@/contexts/PeersProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import {
  getRoutingPeerCount,
  RoutingPeerRow,
  RoutingPeersBar,
  sortRoutingPeerRows,
} from "@/modules/control-center/RoutingPeersBar";

type Props = {
  network: Network;
};

// Live single-network view's routing-peers control — the same button group +
// dropdown as the draft frame's floating bar. Add and row-edit navigate to
// the network page's routing-peers tab (live edits happen there).
export const NetworkRoutingPeerCount = ({ network }: Props) => {
  const router = useRouter();
  const { peers } = usePeers();
  const { groups } = useGroups();
  const { data: apiRouters } = useFetchApi<NetworkRouter[]>(
    `/networks/${network?.id}/routers`,
    false,
    false,
    !!network?.id,
  );

  const openNetworkPage = () => {
    router.push(`/network?id=${network.id}&tab=routing-peers`);
  };

  const rows: RoutingPeerRow[] = useMemo(
    () =>
      sortRoutingPeerRows(
        (apiRouters ?? []).map((r) => {
          const peer = r.peer
            ? peers?.find((p) => p.id === r.peer)
            : undefined;
          const groupId = r.peer_groups?.[0];
          const group = groupId
            ? groups?.find((g) => g.id === groupId)
            : undefined;
          return {
            key: r.id,
            peerOs: peer?.os,
            name: peer?.name ?? group?.name ?? "Routing Peer",
            isGroup: !r.peer,
            peersCount: !r.peer ? group?.peers_count ?? 0 : undefined,
            enabled: r.enabled,
            onEdit: openNetworkPage,
          };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRouters, peers, groups, network?.id],
  );

  return (
    <RoutingPeersBar
      rows={rows}
      count={getRoutingPeerCount(rows)}
      onAdd={openNetworkPage}
    />
  );
};

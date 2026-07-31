import useFetchApi from "@utils/api";
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
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type Props = {
  network: Network;
};

// Live single-network view's routing-peers control — the same button group +
// dropdown as the draft frame's floating bar. Rows open the real routing-peer
// modal (its save PUTs); Add (and the "No Routing Peer" status click) opens
// the same modal to POST a new routing peer against this network.
export const NetworkRoutingPeerCount = ({ network }: Props) => {
  const { peers } = usePeers();
  const { groups } = useGroups();
  const { setRoutingPeerModal } = useDraftMode();
  const { data: apiRouters } = useFetchApi<NetworkRouter[]>(
    `/networks/${network?.id}/routers`,
    false,
    false,
    !!network?.id,
  );

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
            // Opens the real routing-peer modal (its save PUTs).
            onEdit: () => setRoutingPeerModal({ network, router: r }),
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
      onAdd={() => setRoutingPeerModal({ network })}
    />
  );
};

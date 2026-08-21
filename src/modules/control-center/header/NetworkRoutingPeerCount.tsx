import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { usePeers } from "@/contexts/PeersProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import {
  getRoutingPeerCount,
  RoutingPeerRow,
  RoutingPeersBar,
  sortRoutingPeerRows,
} from "@/modules/control-center/panels/RoutingPeersBar";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type Props = {
  network: Network;
};

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
            onEdit: () => setRoutingPeerModal({ network, router: r }),
          };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on network?.id so revalidation doesn't rebuild rows
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

import { useMemo } from "react";
import { useStore } from "@xyflow/react";
import useFetchApi from "@utils/api";
import { NetworkRouter } from "@/interfaces/Network";
import { usePeers } from "@/contexts/PeersProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  getRoutingPeerCount,
  RoutingPeerRow,
  sortRoutingPeerRows,
} from "@/modules/control-center/RoutingPeersBar";

// RoutingPeersBar rows for a draft network frame: the frame's create-router
// changes plus, for existing networks, the API routers. Draft rows carry an
// onEdit opening the routing-peer modal prefilled (the save replaces the
// change). `enabled` gates the API fetch (skip it for live network cards).
export function useFrameRouterRows(
  networkNodeId: string | undefined,
  enabled: boolean,
) {
  const { changes } = useDraftChangeset();
  const { peers } = usePeers();
  const { groups } = useGroups();
  const { setRoutingPeerModal } = useDraftMode();

  // Targeted store selector (string equality) — this hook renders in EVERY
  // network frame; subscribing to the whole nodes array re-rendered them all
  // on every canvas update.
  const networkId = useStore((s) =>
    networkNodeId
      ? (
          s.nodeLookup.get(networkNodeId)?.data as {
            network?: { id?: string };
          }
        )?.network?.id
      : undefined,
  );
  const clientId = networkNodeId?.replace("network-", "");

  const draftRouters = useMemo(
    () =>
      changes.filter(
        (c) =>
          c.type === "create-router" &&
          (c.networkClientId === clientId ||
            (networkId && c.networkId === networkId)),
      ),
    [changes, clientId, networkId],
  );

  const { data: apiRouters, isLoading: isApiLoading } =
    useFetchApi<NetworkRouter[]>(
      `/networks/${networkId}/routers`,
      false,
      false,
      enabled && !!networkId,
    );

  const rows: RoutingPeerRow[] = useMemo(() => {
    if (!networkNodeId) return [];
    const list: RoutingPeerRow[] = [];
    (apiRouters ?? []).forEach((r) => {
      const peer = r.peer ? peers?.find((p) => p.id === r.peer) : undefined;
      const groupId = r.peer_groups?.[0];
      const group = groupId
        ? groups?.find((g) => g.id === groupId)
        : undefined;
      list.push({
        key: `api-${r.id}`,
        peerOs: peer?.os,
        name: peer?.name ?? group?.name ?? "Routing Peer",
        isGroup: !r.peer,
        peersCount: !r.peer ? group?.peers_count ?? 0 : undefined,
        enabled: r.enabled,
        // API routers open the real routing-peer modal (its save PUTs).
        onEdit: () => setRoutingPeerModal({ networkNodeId, router: r }),
      });
    });
    draftRouters.forEach((c) => {
      if (c.type !== "create-router") return;
      const peer = c.peerId
        ? peers?.find((p) => p.id === c.peerId)
        : undefined;
      const group = c.groupId
        ? groups?.find((g) => g.id === c.groupId || g.name === c.groupId)
        : undefined;
      list.push({
        key: `draft-${c.id}`,
        peerOs: peer?.os,
        name: c.peerName ?? c.groupName ?? "Routing Peer",
        isGroup: !c.peerId,
        peersCount: !c.peerId ? group?.peers_count ?? 0 : undefined,
        enabled: c.enabled ?? true,
        onEdit: () =>
          setRoutingPeerModal({ networkNodeId, editChangeId: c.id }),
      });
    });
    return sortRoutingPeerRows(list);
  }, [
    apiRouters,
    draftRouters,
    peers,
    groups,
    networkNodeId,
    setRoutingPeerModal,
  ]);

  return {
    rows,
    count: getRoutingPeerCount(rows),
    // Lazy live fetch in flight (no rows yet) — the popover shows skeletons.
    isLoading: enabled && !!networkId && isApiLoading,
  };
}

import { useMemo } from "react";
import { useStore } from "@xyflow/react";
import useFetchApi from "@utils/api";
import { NetworkRouter } from "@/interfaces/Network";
import { usePeers } from "@/contexts/PeersProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import {
  UpdateRouterChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  getRoutingPeerCount,
  RoutingPeerRow,
  sortRoutingPeerRows,
} from "@/modules/control-center/panels/RoutingPeersBar";

// `enabled` defers the routers fetch until a frame actually needs it.
export function useFrameRouterRows(
  networkNodeId: string | undefined,
  enabled: boolean,
) {
  const { changes } = useDraftChangeset();
  const { peers } = usePeers();
  const { groups } = useGroups();
  const { setRoutingPeerModal } = useDraftMode();

  // This hook runs in every frame; subscribing to all nodes re-rendered them all.
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
      // A pending update-router edit overlays the live values before deploy.
      const pending = changes.find(
        (c): c is UpdateRouterChange =>
          c.type === "update-router" && c.routerId === r.id,
      );
      const peerId = pending ? pending.peerId : r.peer;
      const groupRef = pending ? pending.groupId : r.peer_groups?.[0];
      const enabled = pending ? pending.enabled ?? r.enabled : r.enabled;
      const peer = peerId ? peers?.find((p) => p.id === peerId) : undefined;
      const group = groupRef
        ? groups?.find((g) => g.id === groupRef || g.name === groupRef)
        : undefined;
      list.push({
        key: `api-${r.id}`,
        peerOs: peer?.os,
        name: peer?.name ?? group?.name ?? "Routing Peer",
        isGroup: !peerId,
        peersCount: !peerId ? group?.peers_count ?? 0 : undefined,
        enabled,
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
    changes,
    peers,
    groups,
    networkNodeId,
    setRoutingPeerModal,
  ]);

  return {
    rows,
    count: getRoutingPeerCount(rows),
    isLoading: enabled && !!networkId && isApiLoading,
  };
}

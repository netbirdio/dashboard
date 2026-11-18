import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  DraftChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  getNetworkRef,
  useDraftNetworkActions,
} from "@/modules/control-center/hooks/useDraftNetworkActions";
import { getPlaceholderPeer } from "@/modules/control-center/utils/helpers";
import {
  RoutingPeerModalContent,
  RoutingPeerModalResult,
} from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";

type PendingRouter = Extract<
  DraftChange,
  { type: "create-router" | "update-router" }
>;

// The networks page's routing-peer modal, run in pure-data mode for draft
// targets: the result lands in the changeset instead of a live PUT.
export const DraftRoutingPeerModal = () => {
  const { isDraft, routingPeerModal, setRoutingPeerModal } = useDraftMode();
  const { addRouterFromSelection, updateRouterFromSelection } =
    useDraftNetworkActions();
  const { changes, removeChange } = useDraftChangeset();
  const reactFlow = useReactFlow();
  const { mutate } = useSWRConfig();

  const networkNodeId = routingPeerModal?.networkNodeId;
  const network =
    routingPeerModal?.network ??
    (
      reactFlow.getNodes().find((n) => n.id === networkNodeId)?.data as
        | { network?: Network }
        | undefined
    )?.network;

  const editChange = routingPeerModal?.editChangeId
    ? changes.find(
        (c) =>
          c.id === routingPeerModal.editChangeId && c.type === "create-router",
      )
    : undefined;
  const routerPreset: NetworkRouter | undefined =
    editChange?.type === "create-router"
      ? {
          id: editChange.clientId,
          peer: editChange.peerId ?? "",
          peer_groups: editChange.groupId ? [editChange.groupId] : [],
          metric: editChange.metric ?? 9999,
          masquerade: editChange.masquerade ?? true,
          enabled: editChange.enabled ?? true,
        }
      : routingPeerModal?.router;

  const placeholderPeers = React.useMemo(
    () =>
      isDraft
        ? reactFlow.getNodes().flatMap((n) => {
            const absorbed = (n.data?.draftPeers as Peer[] | undefined) ?? [];
            const standalone = getPlaceholderPeer(n);
            return standalone ? [standalone, ...absorbed] : absorbed;
          })
        : [],
    // Read once per modal open, so the selection does not shift under the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDraft, !!routingPeerModal],
  );

  // A placeholder can finish installing while the modal is open,
  // and by then the changeset no longer knows its draft id.
  const installed = (peer?: Peer): Peer | undefined => {
    const install = changes.find(
      (c) => c.type === "install-peer" && c.clientId === peer?.id,
    );
    return peer && install?.type === "install-peer" && install.installedPeerId
      ? { ...peer, id: install.installedPeerId, name: install.name }
      : peer;
  };

  // The changeset keeps one pending router per peer or group of a network,
  // and the API does not list these yet.
  // A pending edit of a live router counts too: it moves that router onto its new peer.
  const frameRef = getNetworkRef(
    reactFlow.getNodes().find((n) => n.id === networkNodeId),
  );
  const networkKey =
    (editChange?.type === "create-router"
      ? editChange.networkId ?? editChange.networkClientId
      : undefined) ||
    network?.id ||
    frameRef?.networkId ||
    frameRef?.networkClientId;
  const pendingRouters = changes.flatMap((c): PendingRouter[] => {
    if (!networkKey) return [];
    if (c.type === "create-router")
      return c.id !== editChange?.id &&
        (c.networkId ?? c.networkClientId) === networkKey
        ? [c]
        : [];
    if (c.type === "update-router")
      return c.routerId !== routingPeerModal?.router?.id &&
        c.networkId === networkKey
        ? [c]
        : [];
    return [];
  });
  const pendingPeerIds = pendingRouters.flatMap((c) =>
    c.peerId ? [c.peerId] : [],
  );
  const isTaken = (result: RoutingPeerModalResult) => {
    const peerId = installed(result.peer)?.id;
    const group = result.peerGroups[0];
    const groupId = group ? group.id ?? group.name : undefined;
    return pendingRouters.some(
      (c) => c.peerId === peerId && c.groupId === groupId,
    );
  };
  // Recording a duplicate would be dropped or deploy two routers for one peer,
  // so the editor stays open for another choice.
  const refuseTaken = (result: RoutingPeerModalResult) => {
    if (!isTaken(result)) return false;
    notify({
      title: "Routing Peer",
      description: result.peer
        ? `${result.peer.name} is already a routing peer of this network in the draft.`
        : "This group already routes for this network in the draft.",
      backgroundColor: "bg-red-500",
    });
    return true;
  };

  // An existing API router with no draft create-router behind it: live edits
  // PUT through the modal, draft records an update-router change.
  const isApiRouterEdit = !!routingPeerModal?.router && !editChange;
  const isLiveApiEdit = !isDraft && isApiRouterEdit;
  const isDraftApiEdit = isDraft && isApiRouterEdit;
  // Live "Add Routing Peer": the modal's own save POSTs a new router
  const isLiveCreate =
    !isDraft && !!network?.id && !routingPeerModal?.router && !editChange;

  const revalidateLiveRouters = () => {
    if (!network?.id) return;
    void mutate(`/networks/${network.id}/routers`);
    void mutate("/networks");
    void mutate("/groups");
  };

  return (
    <Modal
      open={!!routingPeerModal}
      onOpenChange={(open) => !open && setRoutingPeerModal(null)}
    >
      {routingPeerModal &&
        (isLiveApiEdit ? (
          <RoutingPeerModalContent
            network={network as Network}
            router={routingPeerModal.router}
            onUpdated={() => {
              revalidateLiveRouters();
              setRoutingPeerModal(null);
            }}
          />
        ) : isDraftApiEdit ? (
          <RoutingPeerModalContent
            network={network as Network}
            router={routingPeerModal.router}
            useSave={false}
            additionalPeers={placeholderPeers}
            assignedPeers={pendingPeerIds}
            onSaved={(result) => {
              if (refuseTaken(result)) return;
              if (network?.id && routingPeerModal.router) {
                updateRouterFromSelection({
                  networkId: network.id,
                  networkName: network.name,
                  routerId: routingPeerModal.router.id,
                  ...result,
                  peer: installed(result.peer),
                });
              }
              setRoutingPeerModal(null);
            }}
          />
        ) : isLiveCreate ? (
          <RoutingPeerModalContent
            network={network as Network}
            onCreated={() => {
              revalidateLiveRouters();
              setRoutingPeerModal(null);
            }}
          />
        ) : (
          <RoutingPeerModalContent
            network={{ id: "", name: network?.name ?? "" } as Network}
            router={routerPreset}
            useSave={false}
            additionalPeers={placeholderPeers}
            assignedPeers={pendingPeerIds}
            onSaved={(result) => {
              // The check runs before the edited change is removed,
              // or a refused edit would lose the router it replaces.
              if (refuseTaken(result)) return;
              if (networkNodeId) {
                // Editing replaces the change so the dedup rules re-apply.
                if (editChange) {
                  removeChange(editChange.id, { replaced: true });
                }
                addRouterFromSelection({
                  networkNodeId,
                  ...result,
                  peer: installed(result.peer),
                });
              }
              setRoutingPeerModal(null);
            }}
          />
        ))}
    </Modal>
  );
};

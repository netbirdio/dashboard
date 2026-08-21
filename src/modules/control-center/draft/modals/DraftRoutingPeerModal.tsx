import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { RoutingPeerModalContent } from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";

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
  // Placeholder-peer routers ("draft-…" ids) skip the peer prefill, since the
  // modal would try to fetch them from the API.
  const routerPreset: NetworkRouter | undefined =
    editChange?.type === "create-router"
      ? {
          id: editChange.clientId,
          peer:
            editChange.peerId && !editChange.peerId.startsWith("draft-")
              ? editChange.peerId
              : "",
          peer_groups: editChange.groupId ? [editChange.groupId] : [],
          metric: editChange.metric ?? 9999,
          masquerade: editChange.masquerade ?? true,
          enabled: editChange.enabled ?? true,
        }
      : routingPeerModal?.router;

  // An existing API router with no draft create-router behind it: live edits
  // PUT through the modal, draft records an update-router change.
  const isApiRouterEdit = !!routingPeerModal?.router && !editChange;
  const isLiveApiEdit = !isDraft && isApiRouterEdit;
  const isDraftApiEdit = isDraft && isApiRouterEdit;
  // Live "Add Routing Peer": the modal's own save POSTs a new router.
  const isLiveCreate =
    !isDraft &&
    !!network?.id &&
    !routingPeerModal?.router &&
    !editChange &&
    !networkNodeId;

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
            onSaved={(result) => {
              if (network?.id && routingPeerModal.router) {
                updateRouterFromSelection({
                  networkId: network.id,
                  networkName: network.name,
                  routerId: routingPeerModal.router.id,
                  ...result,
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
            onSaved={(result) => {
              if (networkNodeId) {
                // Editing replaces the change so the dedup rules re-apply.
                if (editChange) removeChange(editChange.id);
                addRouterFromSelection({ networkNodeId, ...result });
              }
              setRoutingPeerModal(null);
            }}
          />
        ))}
    </Modal>
  );
};

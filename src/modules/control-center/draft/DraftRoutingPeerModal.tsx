import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { RoutingPeerModalContent } from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";

// The networks page's routing-peer modal. Draft targets run in pure-data
// mode (useSave={false}) — the pick lands in the changeset via
// addRouterFromSelection; with editChangeId set (frame's routing-peers
// dropdown) the modal opens prefilled from that create-router change and the
// save replaces it. With `router` set (an API router picked from a
// routing-peers dropdown) the REAL modal opens against the real network —
// its save PUTs via the API.
export const DraftRoutingPeerModal = () => {
  const { isDraft, routingPeerModal, setRoutingPeerModal } = useDraftMode();
  const { addRouterFromSelection } = useDraftNetworkActions();
  const { changes, removeChange } = useDraftChangeset();
  const reactFlow = useReactFlow();

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
  // Prefill for edit mode — a NetworkRouter shaped from the draft change.
  // Placeholder-peer routers ("draft-…" ids) skip the peer prefill: the
  // modal would try to fetch them from the API. An API router preset
  // (read-only view) is passed through as-is.
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

  // An API router (picked from a routing-peers dropdown) edits the REAL
  // network via the modal's own save.
  const isApiRouter = !!routingPeerModal?.router && !editChange;

  return (
    <Modal
      open={!!routingPeerModal}
      onOpenChange={(open) => !open && setRoutingPeerModal(null)}
    >
      {routingPeerModal &&
        (isApiRouter ? (
          <RoutingPeerModalContent
            network={network as Network}
            router={routingPeerModal.router}
            onUpdated={() => setRoutingPeerModal(null)}
          />
        ) : (
          <RoutingPeerModalContent
            network={{ id: "", name: network?.name ?? "" } as Network}
            router={routerPreset}
            useSave={false}
            onSaved={(result) => {
              if (networkNodeId) {
                // Editing replaces the change (same dedup rules re-apply).
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

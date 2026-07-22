import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { RoutingPeerModalContent } from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";

// The networks page's routing-peer modal in pure-data mode (useSave={false})
// — the pick lands in the changeset via addRouterFromSelection. With
// editChangeId set (frame's routing-peers dropdown), the modal opens
// prefilled from that create-router change and the save replaces it.
export const DraftRoutingPeerModal = () => {
  const { routingPeerModal, setRoutingPeerModal } = useDraftMode();
  const { addRouterFromSelection } = useDraftNetworkActions();
  const { changes, removeChange } = useDraftChangeset();
  const reactFlow = useReactFlow();

  const networkNodeId = routingPeerModal?.networkNodeId;
  const network = (
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
      : undefined;

  return (
    <Modal
      open={!!routingPeerModal}
      onOpenChange={(open) => !open && setRoutingPeerModal(null)}
    >
      {routingPeerModal && networkNodeId && (
        <RoutingPeerModalContent
          network={{ id: "", name: network?.name ?? "" } as Network}
          router={routerPreset}
          useSave={false}
          onSaved={(result) => {
            // Editing replaces the change (same dedup rules re-apply).
            if (editChange) removeChange(editChange.id);
            addRouterFromSelection({ networkNodeId, ...result });
            setRoutingPeerModal(null);
          }}
        />
      )}
    </Modal>
  );
};

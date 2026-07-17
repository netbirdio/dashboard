import { Modal } from "@components/modal/Modal";
import { useReactFlow } from "@xyflow/react";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { RoutingPeerModalContent } from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";

// The networks page's routing-peer modal in pure-data mode (useSave={false})
// — the pick lands on the canvas (node + routing edge) and in the changeset
// via addRouterFromSelection.
export const DraftRoutingPeerModal = () => {
  const { routingPeerModal, setRoutingPeerModal } = useDraftMode();
  const { addRouterFromSelection } = useDraftNetworkActions();
  const reactFlow = useReactFlow();

  const networkNodeId = routingPeerModal?.networkNodeId;
  const network = (
    reactFlow.getNodes().find((n) => n.id === networkNodeId)?.data as
      | { network?: Network }
      | undefined
  )?.network;

  return (
    <Modal
      open={!!routingPeerModal}
      onOpenChange={(open) => !open && setRoutingPeerModal(null)}
    >
      {routingPeerModal && networkNodeId && (
        <RoutingPeerModalContent
          network={{ id: "", name: network?.name ?? "" } as Network}
          useSave={false}
          onSaved={(result) => {
            addRouterFromSelection({ networkNodeId, ...result });
            setRoutingPeerModal(null);
          }}
        />
      )}
    </Modal>
  );
};

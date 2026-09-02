import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { useReactFlow } from "@xyflow/react";
import { Share2Icon } from "lucide-react";
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
  // The placeholder is not listable in the peer dropdown and the modal refuses to
  // save without a selection, so editing is blocked until the peer installs.
  const isPlaceholderBound =
    editChange?.type === "create-router" &&
    !!editChange.peerId?.startsWith("draft-");

  const routerPreset: NetworkRouter | undefined =
    editChange?.type === "create-router"
      ? {
          id: editChange.clientId,
          peer: !isPlaceholderBound ? editChange.peerId ?? "" : "",
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
        (isPlaceholderBound ? (
          <ModalContent maxWidthClass={"max-w-md"}>
            <ModalHeader
              icon={<Share2Icon size={20} />}
              color={"netbird"}
              title={"Routing peer not installed yet"}
              description={
                "This routing peer uses a peer that hasn't been installed. " +
                "Install it to edit these settings, or remove this change " +
                "and add the routing peer again."
              }
            />
            <ModalFooter>
              <ModalClose asChild={true}>
                <Button variant={"primary"} className={"w-full"}>
                  Got it
                </Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        ) : isLiveApiEdit ? (
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

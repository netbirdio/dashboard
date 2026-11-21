import * as React from "react";
import { useEffect, useRef } from "react";
import ExitNodesProvider, {
  useExitNodes,
} from "@/modules/exit-nodes/ExitNodesProvider";
import { getPeerExitNode } from "@/modules/exit-nodes/exitNodeHelpers";

type Props = {
  peerId?: string;
  open: boolean;
  onClose: () => void;
};

/**
 * The exit node modal opened from a peer (peers table, peer page): edits the
 * exit node the peer is in, or sets up a new one that starts with the peer.
 */
export default function PeerExitNodeModal({
  peerId,
  open,
  onClose,
}: Readonly<Props>) {
  if (!open || !peerId) return null;
  return (
    <ExitNodesProvider onModalClose={onClose}>
      <OpenForPeer peerId={peerId} />
    </ExitNodesProvider>
  );
}

const OpenForPeer = ({ peerId }: { peerId: string }) => {
  const { exitNodes, isLoading, openExitNodeModal } = useExitNodes();
  const opened = useRef(false);

  // Waits for the exit nodes, so a peer that is already in one is edited
  // there rather than added to a second one (which the API refuses).
  useEffect(() => {
    if (opened.current || isLoading) return;
    opened.current = true;
    const exitNode = getPeerExitNode(exitNodes, peerId);
    if (exitNode) openExitNodeModal(exitNode);
    else openExitNodeModal(undefined, { peerIds: [peerId] });
  }, [exitNodes, isLoading, openExitNodeModal, peerId]);

  return null;
};

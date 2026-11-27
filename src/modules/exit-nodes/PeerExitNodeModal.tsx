import * as React from "react";
import { useEffect, useRef } from "react";
import ExitNodesProvider, {
  useExitNodes,
} from "@/modules/exit-nodes/ExitNodesProvider";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { getPeerExitNode } from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodeModal from "@/modules/exit-nodes/modal/ExitNodeModal";

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

type EditProps = {
  exitNodeId?: string;
  open: boolean;
  onClose: () => void;
};

/** The edit modal of one exit node, for pages outside Exit Nodes. */
export function EditExitNodeModal({
  exitNodeId,
  open,
  onClose,
}: Readonly<EditProps>) {
  if (!open || !exitNodeId) return null;
  return (
    <ExitNodesProvider onModalClose={onClose}>
      <OpenById exitNodeId={exitNodeId} onMissing={onClose} />
    </ExitNodesProvider>
  );
}

const OpenById = ({
  exitNodeId,
  onMissing,
}: {
  exitNodeId: string;
  onMissing: () => void;
}) => {
  const { exitNodes, isLoading, openExitNodeModal } = useExitNodes();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || isLoading) return;
    opened.current = true;
    const exitNode = exitNodes?.find((n) => n.id === exitNodeId);
    // Deleted meanwhile: nothing to edit.
    if (exitNode) openExitNodeModal(exitNode);
    else onMissing();
  }, [exitNodes, isLoading, openExitNodeModal, exitNodeId, onMissing]);

  return null;
};

type DraftProps = {
  // The exit node as the draft sees it; empty to create one.
  exitNode?: ExitNode;
  // Every exit node in the draft, for the name and peer checks.
  otherExitNodes: ExitNode[];
  open: boolean;
  onClose: () => void;
  onSubmit: (request: ExitNodeRequest) => void;
};

/**
 * The exit node modal for the Control Center's draft mode: saving hands the
 * request to the draft instead of the API.
 */
export function DraftExitNodeModal({
  exitNode,
  otherExitNodes,
  open,
  onClose,
  onSubmit,
}: Readonly<DraftProps>) {
  if (!open) return null;
  return (
    <ExitNodesProvider>
      <ExitNodeModal
        open={true}
        setOpen={(o) => {
          if (!o) onClose();
        }}
        exitNode={exitNode}
        otherExitNodes={otherExitNodes}
        onDraftSubmit={(request) => {
          onSubmit(request);
          onClose();
        }}
      />
    </ExitNodesProvider>
  );
}

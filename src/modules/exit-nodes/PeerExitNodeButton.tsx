import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import { isRoutingPeerSupported } from "@utils/version";
import { SquarePenIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Peer } from "@/interfaces/Peer";
import PeerExitNodeModal from "@/modules/exit-nodes/PeerExitNodeModal";
import { usePeerExitNode } from "@/modules/exit-nodes/usePeerExitNode";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  peer: Peer;
};

/** Peer page: set up an exit node with this peer, or edit the one it's in. */
export const PeerExitNodeButton = ({ peer }: Readonly<Props>) => {
  const [open, setOpen] = useState(false);
  const permission = useExitNodePermissions();
  const { exitNode } = usePeerExitNode(peer.id);
  const isSupported = isRoutingPeerSupported(peer.version, peer.os);

  const disabled = exitNode
    ? !permission?.update
    : !permission?.create || !isSupported;

  return (
    <>
      <FullTooltip
        // Otherwise it stays on top of the modal the click opened.
        disabled={open}
        content={
          <div className={"text-xs max-w-xs"}>
            {exitNode ? (
              <>
                This peer is part of the exit node{" "}
                <span className={"text-white font-medium"}>
                  {exitNode.name}
                </span>
                .
              </>
            ) : isSupported ? (
              "Route internet traffic through this peer by adding it to a new exit node."
            ) : (
              "Update NetBird on this peer to v0.36.6 or later to use it as an exit node."
            )}
          </div>
        }
      >
        <Button
          variant={"secondary"}
          onClick={() => setOpen(true)}
          disabled={disabled}
          data-testid={"peer-exit-node-button"}
        >
          {exitNode ? (
            <>
              <SquarePenIcon size={16} />
              Edit Exit Node
            </>
          ) : (
            <>
              <IconDirectionSign size={16} className={"text-yellow-400"} />
              Set Up Exit Node
            </>
          )}
        </Button>
      </FullTooltip>
      <PeerExitNodeModal
        peerId={peer.id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

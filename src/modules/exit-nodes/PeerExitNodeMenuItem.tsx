import { DropdownMenuItem } from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import { isRoutingPeerSupported } from "@utils/version";
import { SquarePenIcon } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { usePeerExitNode } from "@/modules/exit-nodes/usePeerExitNode";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  peer: Peer;
  // Opens PeerExitNodeModal, rendered outside the menu: the menu unmounts its
  // items when it closes.
  onSelect: () => void;
};

/** Peers table action: set up an exit node with this peer, or edit its one. */
export const PeerExitNodeMenuItem = ({ peer, onSelect }: Readonly<Props>) => {
  const permission = useExitNodePermissions();
  const { exitNode } = usePeerExitNode(peer.id);
  const isSupported = isRoutingPeerSupported(peer.version, peer.os);

  const disabled = exitNode
    ? !permission?.update
    : !permission?.create || !isSupported;

  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          Update NetBird on this peer to v0.36.6 or later to use it as an exit
          node.
        </div>
      }
      disabled={!!exitNode || isSupported}
      className={"w-full"}
    >
      <DropdownMenuItem
        onClick={onSelect}
        disabled={disabled}
        data-testid={"peer-exit-node-action"}
      >
        <div className={"flex gap-3 items-center w-full"}>
          {exitNode ? (
            <>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit Exit Node
            </>
          ) : (
            <>
              <IconDirectionSign
                size={14}
                className={"shrink-0 text-yellow-400"}
              />
              Set Up Exit Node
            </>
          )}
        </div>
      </DropdownMenuItem>
    </FullTooltip>
  );
};

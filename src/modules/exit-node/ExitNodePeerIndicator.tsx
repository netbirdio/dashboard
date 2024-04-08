import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";

type Props = {
  peer: Peer;
};
export const ExitNodePeerIndicator = ({ peer }: Props) => {
  const hasExitNode = useHasExitNodes(peer);

  return hasExitNode ? (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          This peer has an exit node. Traffic from the configured distribution
          groups will be routed through this peer.
        </div>
      }
    >
      <IconDirectionSign size={15} className={"text-yellow-400 shrink-0"} />
    </FullTooltip>
  ) : null;
};

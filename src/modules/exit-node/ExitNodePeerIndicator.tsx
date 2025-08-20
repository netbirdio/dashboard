import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";

type Props = {
  peer: Peer;
};
export const ExitNodePeerIndicator = ({ peer }: Props) => {
  const exitNodeInfo = useHasExitNodes(peer);

  if (!exitNodeInfo.hasExitNode) {
    return null;
  }

  const tooltipContent = exitNodeInfo.skipAutoApply === false
    ? "This peer is an auto-applied exit node. Traffic from the configured distribution groups will be routed through this peer."
    : "This peer is an exit node. Traffic from the configured distribution groups will be routed through this peer.";

  return (
    <FullTooltip content={<div className={"text-xs max-w-xs"}>{tooltipContent}</div>}>
      <IconDirectionSign 
        size={15} 
        className={`shrink-0 ${exitNodeInfo.skipAutoApply === false ? "text-green-400" : "text-yellow-400"}`} 
      />
    </FullTooltip>
  );
};

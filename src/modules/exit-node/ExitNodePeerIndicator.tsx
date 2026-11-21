import FullTooltip from "@components/FullTooltip";
import { IconDirectionSign } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";
import { usePeerExitNode } from "@/modules/exit-nodes/usePeerExitNode";

type Props = {
  peer: Peer;
};

/**
 * Marks a peer that routes internet traffic: one in an exit node, or one
 * with a legacy 0.0.0.0/0 route not converted to an exit node yet. Green
 * when it is applied automatically.
 */
export const ExitNodePeerIndicator = ({ peer }: Props) => {
  const { exitNode } = usePeerExitNode(peer.id);
  const legacy = useHasExitNodes(peer);

  let autoApplied: boolean;
  let tooltip: React.ReactNode;
  if (exitNode) {
    autoApplied = exitNode.enabled && exitNode.auto_apply;
    tooltip = (
      <>
        This peer is part of the exit node{" "}
        <span className={"text-white font-medium"}>{exitNode.name}</span>
        {exitNode.enabled ? "" : " (disabled)"}.{" "}
        {autoApplied
          ? "It is applied automatically to the peers its policies allow."
          : "Peers its policies allow can route their traffic through it."}
      </>
    );
  } else if (legacy.hasExitNode) {
    autoApplied = legacy.skipAutoApply === false;
    tooltip = autoApplied
      ? "This peer is an auto-applied exit node. Traffic from the configured distribution groups will be routed through this peer."
      : "This peer is an exit node. Traffic from the configured distribution groups will be routed through this peer.";
  } else {
    return null;
  }

  return (
    <FullTooltip content={<div className={"text-xs max-w-xs"}>{tooltip}</div>}>
      <IconDirectionSign
        size={15}
        className={cn(
          "shrink-0",
          autoApplied ? "text-green-400" : "text-yellow-400",
        )}
        data-testid={"peer-exit-node-indicator"}
      />
    </FullTooltip>
  );
};

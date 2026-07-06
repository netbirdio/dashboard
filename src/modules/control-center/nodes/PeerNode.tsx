import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";

export type PeerNodeType = Node<
  {
    peer: Peer;
    enabled?: boolean;
    onClick?: (p: Peer) => void;
    showHandles?: boolean;
    variant?: "default" | "card";
  },
  "peerNode"
>;

export const PeerNode = ({ data, id }: PeerNodeType) => {
  const {
    peer,
    enabled,
    onClick,
    showHandles = true,
    variant = "default",
  } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden transition-all group/node pr-5 pl-3 py-1",
        variant === "card" && "bg-nb-gray-940 border border-nb-gray-900",
        variant === "default" && "border-0",
        onClick &&
          "border-transparent border hover:border-nb-gray-900 rounded-lg hover:bg-nb-gray-930 cursor-pointer",
        isTarget && "hover:bg-nb-gray-930 pl-3 py-1 hover:ring-2 ring-white",
      )}
      onClick={() => onClick?.(peer)}
    >
      <DeviceCard
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60", "w-auto")}
      />
      {showHandles && (
        <>
          <AllHandles />
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
        </>
      )}
    </div>
  );
};

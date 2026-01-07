import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type PeerNodeProps = Node<
  {
    peer: Peer;
    enabled?: boolean;
    onClick?: (p: Peer) => void;
  },
  "peerNode"
>;

export const PeerNode = ({ data, id }: PeerNodeProps) => {
  const { peer, enabled, onClick } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;

  return (
    <div
      className={cn(
        "border-0 border-nb-gray-800 rounded-lg overflow-hidden transition-all",
        onClick &&
          "border-transparent border hover:border-nb-gray-800 rounded-lg hover:bg-nb-gray-930 cursor-pointer pl-3 py-1 pr-5",
      )}
      onClick={() => onClick?.(peer)}
    >
      <DeviceCard
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60", onClick && "w-auto")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};

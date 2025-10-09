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
  },
  "peerNode"
>;

export const PeerNode = ({ data, id }: PeerNodeProps) => {
  const { peer, enabled } = data;
  const isEnabled = useAnySourceGroupEnabled(id);

  return (
    <div
      className={
        "border-0 border-nb-gray-800 rounded-lg overflow-hidden transition-all"
      }
    >
      <DeviceCard
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60")}
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

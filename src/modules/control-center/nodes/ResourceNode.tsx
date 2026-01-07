import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type ResourceNode = Node<
  {
    resource?: NetworkResource;
    peer?: Peer;
    enabled?: boolean;
    className?: string;
  },
  "resourceNode"
>;

export const ResourceNode = ({ data, id }: ResourceNode) => {
  const { enabled, resource, peer, className } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;

  return (
    <div
      className={cn(
        "cursor-pointer border-0 border-nb-gray-800 rounded-lg overflow-hidden transition-all",
        className,
      )}
    >
      <DeviceCard
        resource={resource}
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60")}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        style={{
          opacity: 0,
        }}
      />
    </div>
  );
};

import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type ResourceNode = Node<
  {
    resource: NetworkResource;
    enabled?: boolean;
  },
  "resourceNode"
>;

export const ResourceNode = ({ data, id }: ResourceNode) => {
  const { enabled, resource } = data;

  const isEnabled = useAnySourceGroupEnabled(id);

  return (
    <div
      className={
        "cursor-pointer border-0 border-nb-gray-800 rounded-lg overflow-hidden transition-all"
      }
    >
      <DeviceCard
        resource={resource}
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

import { cn } from "@utils/helpers";
import { type Node, useConnection } from "@xyflow/react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";

type ResourceNode = Node<
  {
    resource?: NetworkResource;
    peer?: Peer;
    enabled?: boolean;
    showHandles?: boolean;
    className?: string;
  },
  "resourceNode"
>;

export const ResourceNode = ({ data, id }: ResourceNode) => {
  const { enabled, resource, peer, showHandles = false, className } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div
      className={cn(
        "cursor-pointer border-0 border-nb-gray-900 rounded-lg overflow-hidden transition-all group/node",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        className,
      )}
    >
      <DeviceCard
        resource={resource}
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60")}
      />
      <AllHandles />
    </div>
  );
};

import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { NetworkIcon } from "lucide-react";
import * as React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Network, NetworkResource } from "@/interfaces/Network";
import { DeviceCard } from "@components/DeviceCard";

type NetworkNodeType = {
  network: Network;
};

type NetworkNodeProps = Node<NetworkNodeType, "networkNode">;

export const NetworkNode = ({ data }: NetworkNodeProps) => {
  const { data: networkResources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );

  const n = data.network as Network;
  const routingPeersCount = n?.routing_peers_count ?? 0;
  const resourceIds = n?.resources || [];
  const resources =
    networkResources?.filter((r) => resourceIds.includes(r?.id || "")) || [];

  return (
    <div
      className={cn(
        "bg-nb-gray-940 border border-nb-gray-800 rounded-2xl overflow-hidden group hover:bg-nb-gray-935 transition-all cursor-pointer",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-between text-nb-gray-300 gap-2 text-sm pl-6 pr-6 py-3.5 font-normal bg-nb-gray-935 border-b border-nb-gray-800 group-hover:bg-nb-gray-930 transition-all",
          resources?.length === 0 && "border-b-0",
        )}
      >
        <div className={"flex items-center gap-3 font-normal text-sm"}>
          <div>
            <div
              className={
                " text-nb-gray-100 font-medium whitespace-nowrap flex items-center gap-2"
              }
            >
              <NetworkIcon size={12} />
              {n?.name}
            </div>
            <div className={"text-nb-gray-400 whitespace-nowrap mt-0.5"}>
              {resources?.length || 0} Resources
            </div>
          </div>
        </div>
        <div className={"flex items-center gap-2 text-xs"}>
          <CircleIcon
            size={8}
            className={cn(
              "shrink-0 block",
              routingPeersCount === 0 && "bg-nb-gray-500",
              routingPeersCount === 1 && "bg-yellow-400",
              routingPeersCount > 1 && "bg-green-400",
            )}
          />
          {routingPeersCount} Routing Peer(s)
        </div>
      </div>

      {resources && resources.length > 0 && (
        <div className={"p-2 flex flex-col gap-4 relative"}>
          <div className={"grid grid-cols-2 relative z-0"}>
            {resources?.slice(0, 6).map((r) => {
              return <DeviceCard resource={r} key={r.id} />;
            })}
          </div>
          <div
            className={cn(
              "absolute w-full h-full bg-gradient-to-b from-transparent via-nb-gray-940/20 to-nb-gray-940 z-10 left-0 top-0 pointer-events-none",
              resources?.length > 6 ? "opacity-100" : "opacity-0",
            )}
          ></div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        style={{
          opacity: 0,
        }}
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

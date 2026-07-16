import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position, useConnection } from "@xyflow/react";
import { NetworkIcon, PlusCircleIcon } from "lucide-react";
import * as React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";
import {
  DraftNetworkRef,
  getDraftResource,
} from "@/modules/control-center/utils/helpers";

type NetworkNodeType = {
  network: Network;
};

type NetworkNodeProps = Node<NetworkNodeType, "networkNode">;

// Traffic light: gray = 0, yellow = 1, green ≥ 2 (HA).
const RoutingPeersIndicator = ({
  count,
  hideWhenZero = false,
  dotSize = 8,
  className,
}: {
  count: number;
  hideWhenZero?: boolean;
  dotSize?: number;
  className?: string;
}) => {
  if (hideWhenZero && count === 0) return null;
  return (
    <div className={cn("flex items-center", className)}>
      <CircleIcon
        size={dotSize}
        className={cn(
          "shrink-0 block",
          count === 0 && "bg-nb-gray-500",
          count === 1 && "bg-yellow-400",
          count > 1 && "bg-green-400",
        )}
      />
      {count} Routing Peer(s)
    </div>
  );
};

// Floating "Add Routing Peer" above the node — the install path for the
// network's first router (drops a connected Server placeholder + opens the
// setup-key flow).
const AddRoutingPeerButton = ({ networkNodeId }: { networkNodeId: string }) => {
  const { addRoutingPeer } = useDraftNodeCreation();
  return (
    <div className={"absolute bottom-full left-0 mb-2"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          addRoutingPeer(networkNodeId);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs shrink-0 whitespace-nowrap",
          "bg-nb-gray-920 border border-gray-700/40 text-gray-400",
          "hover:text-white hover:bg-nb-gray-910 transition-colors",
        )}
      >
        <PlusCircleIcon size={13} />
        Add Routing Peer
      </button>
    </div>
  );
};

export const NetworkNode = ({ data, id }: NetworkNodeProps) => {
  const { data: networkResources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { isDraft } = useDraftMode();
  const { nodes, edges, contextMenuNodeId } = useCanvasState();
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode?.id !== id;
  const showHalo = contextMenuNodeId === id;

  const n = data.network as Network;
  // Draft networks have no API id — their state lives on the canvas.
  const isNew = !n?.id;

  // Draft members: resource nodes assigned to this network via the editor or
  // drag-onto-network (matched by node id for draft networks, API id
  // otherwise).
  const draftResources = React.useMemo(
    () =>
      nodes
        .filter((node) => {
          const ref = (node.data as { draftNetwork?: DraftNetworkRef })
            ?.draftNetwork;
          if (!ref) return false;
          return ref.networkClientId
            ? `network-${ref.networkClientId}` === id
            : !!n?.id && ref.networkId === n.id;
        })
        .map((node) => getDraftResource(node))
        .filter(Boolean) as NetworkResource[],
    [nodes, id, n?.id],
  );

  const resourceIds = n?.resources || [];
  const apiResources =
    networkResources?.filter((r) => resourceIds.includes(r?.id || "")) || [];
  const resources = [...apiResources, ...draftResources];

  // Draft routers: routing edges targeting this network node.
  const draftRouterCount = React.useMemo(
    () =>
      edges.filter(
        (e) => e.target === id && (e.data as { router?: boolean })?.router,
      ).length,
    [edges, id],
  );
  const routingPeersCount = (n?.routing_peers_count ?? 0) + draftRouterCount;

  // Draft networks render as a FRAME: dashed border + solid background, with
  // their resource nodes living inside as ReactFlow children. The node's
  // width/height come from its style (sized to the member count).
  if (isNew) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-xl border border-dashed border-nb-gray-700 bg-nb-gray-940 relative transition-all",
          // Same hover treatment as peer nodes.
          "hover:bg-nb-gray-930 hover:border-nb-gray-600",
          isDraft && isTarget && "ring-2 ring-white/60 bg-nb-gray-930",
          showHalo && "ring-2 ring-sky-500",
        )}
      >
        <div className={"flex items-center justify-between px-5 pt-4"}>
          <div
            className={
              "flex items-center gap-2 text-nb-gray-100 text-[0.85rem] font-medium min-w-0"
            }
          >
            <NetworkIcon size={13} className={"shrink-0 text-nb-gray-300"} />
            <span className={"truncate"}>{n?.name}</span>
          </div>
          {/* Hidden entirely at 0 — the floating Add Routing Peer button
              carries that state. */}
          <RoutingPeersIndicator
            count={routingPeersCount}
            hideWhenZero
            dotSize={7}
            className={"gap-1.5 text-[0.7rem] text-nb-gray-400 shrink-0"}
          />
        </div>

        {resources.length === 0 && (
          <div
            className={
              "absolute inset-x-0 top-[64px] bottom-5 flex items-center justify-center text-sm text-nb-gray-500 font-light pointer-events-none"
            }
          >
            No resources yet
          </div>
        )}

        {isDraft && routingPeersCount === 0 && (
          <AddRoutingPeerButton networkNodeId={id} />
        )}
        {isDraft && <FullAreaTargetHandle isConnectable={isTarget} />}
      </div>
    );
  }

  // Existing networks (live network view) keep the card layout.
  return (
    <div
      className={cn(
        "bg-nb-gray-940 border border-nb-gray-900 rounded-2xl overflow-hidden group hover:bg-nb-gray-935 transition-all cursor-pointer relative",
        isDraft && isTarget && "hover:bg-nb-gray-930 ring-2 ring-white/60",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-between text-nb-gray-300 gap-2 text-sm pl-6 pr-6 py-3.5 font-normal bg-nb-gray-935 border-b border-nb-gray-900 group-hover:bg-nb-gray-930 transition-all",
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
        <RoutingPeersIndicator
          count={routingPeersCount}
          className={"gap-2 text-xs"}
        />
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

      {isDraft && routingPeersCount === 0 && (
        <AddRoutingPeerButton networkNodeId={id} />
      )}

      {/* Anchors for the live network view's edges. */}
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        isConnectable={false}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        isConnectable={false}
        style={{ opacity: 0 }}
      />
      {isDraft && <FullAreaTargetHandle isConnectable={isTarget} />}
    </div>
  );
};

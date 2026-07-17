import useFetchApi from "@utils/api";
import { cn, singularize } from "@utils/helpers";
import { Handle, type Node, Position, useConnection } from "@xyflow/react";
import { HelpCircle, NetworkIcon, PlusCircleIcon } from "lucide-react";
import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
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
  zeroLabel,
  helpIcon = false,
}: {
  count: number;
  hideWhenZero?: boolean;
  dotSize?: number;
  className?: string;
  zeroLabel?: string;
  helpIcon?: boolean;
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
      {count === 0 && zeroLabel
        ? zeroLabel
        : singularize("Routing Peers", count, true)}
      {helpIcon && <HelpCircle size={12} className={"shrink-0"} />}
    </div>
  );
};

// Floating "Add Routing Peer" above the node — the install path for the
// network's first router (drops a connected Server placeholder + opens the
// setup-key flow).
const AddRoutingPeerButton = ({ networkNodeId }: { networkNodeId: string }) => {
  const { setRoutingPeerModal } = useDraftMode();
  return (
    <div className={"absolute bottom-full left-0 mb-3"}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setRoutingPeerModal({ networkNodeId });
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs shrink-0 whitespace-nowrap",
          "bg-nb-gray-920 border border-gray-700/40 text-gray-400",
          "hover:text-white hover:bg-nb-gray-910 transition-colors",
        )}
      >
        <PlusCircleIcon size={12} />
        Add Routing Peer
      </button>
    </div>
  );
};

// One component, two variants: draft networks (no API id) render as a FRAME
// — dashed border, solid bg, resources living inside as ReactFlow children,
// sized via the node style. Existing networks (live network view) keep the
// card with the resource preview grid.
export const NetworkNode = ({ data, id }: NetworkNodeProps) => {
  const { data: networkResources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const {
    isDraft,
    setRoutingPeerModal,
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
    hoveredNetworkNodeId,
  } = useDraftMode();
  const isFrameHovered = hoveredNetworkNodeId === id;
  const isDrilled = drillDownNetworkNodeId === id;
  const { nodes, edges, contextMenuNodeId } = useCanvasState();
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode?.id !== id;
  const showHalo = contextMenuNodeId === id;

  const n = data.network as Network;
  const isFrame = !n?.id;

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

  // Draft routers: create-router changes for this network (routers have no
  // canvas representation — the count IS the state).
  const { changes } = useDraftChangeset();
  const clientId = id.replace("network-", "");
  const draftRouterCount = React.useMemo(
    () =>
      changes.filter(
        (c) =>
          c.type === "create-router" &&
          (c.networkClientId === clientId || (n?.id && c.networkId === n.id)),
      ).length,
    [changes, clientId, n?.id],
  );
  const routingPeersCount = (n?.routing_peers_count ?? 0) + draftRouterCount;

  return (
    <div
      // Clicking the frame drills into the single-network view (§10).
      onClick={
        isDraft && isFrame && !isDrilled
          ? () => setDrillDownNetworkNodeId(id)
          : undefined
      }
      className={cn(
        "relative transition-all border bg-nb-gray-940",
        isFrame
          ? "w-full h-full rounded-xl border border-nb-gray-800 group group/node"
          : "rounded-2xl border-nb-gray-900 overflow-hidden group hover:bg-nb-gray-935 cursor-pointer",
        isFrame && isFrameHovered && "border-nb-gray-700",
        isDraft && isFrame && !isDrilled && "cursor-pointer",
        isDraft &&
          isTarget &&
          "hover:ring-2 hover:ring-white/60 hover:bg-nb-gray-930",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      {/* Header: icon + name (+ resource count on the card) | routing light */}
      <div
        className={cn(
          "flex items-center justify-between",
          cn(
            "w-full text-nb-gray-300 gap-2 text-sm pl-6 pr-6 py-3.5 font-normal bg-nb-gray-935 border-b border-nb-gray-800 transition-all rounded-t-[11px]",
            isFrame && isFrameHovered && "bg-nb-gray-930 border-nb-gray-700",
            !isFrame && "group-hover:bg-nb-gray-930",
            resources.length === 0 && "border-b-0",
          ),
        )}
      >
        <div className={"min-w-0"}>
          <div
            className={cn(
              "text-nb-gray-100 font-medium flex items-center gap-2 min-w-0",
              "whitespace-nowrap",
            )}
          >
            <NetworkIcon size={12} className={"shrink-0 text-nb-gray-300"} />
            <span className={"truncate"}>{n?.name}</span>
            {isFrame && <SmallBadge />}
          </div>
          <div className={cn("text-nb-gray-400 whitespace-nowrap mt-0.5")}>
            {singularize("Resources", resources.length, true)}
          </div>
        </div>
        {/* The frame's routing count lives in the floating button group. */}
        {!isFrame && (
          <RoutingPeersIndicator
            count={routingPeersCount}
            className={"gap-2 text-xs shrink-0"}
          />
        )}
      </div>

      {/* Body: the frame's resources render as child NODES inside it (hint
          when empty); the card previews its resources as a grid. */}
      {isFrame && resources.length === 0 && (
        <div
          className={
            "absolute inset-x-0 top-[72px] bottom-4 flex items-center justify-center text-sm text-nb-gray-500 font-light pointer-events-none"
          }
        >
          No resources yet
        </div>
      )}
      {!isFrame && resources.length > 0 && (
        <div className={"px-2 flex flex-col gap-4 relative"}>
          <div className={"grid grid-cols-2 relative z-0"}>
            {resources.slice(0, 6).map((r) => (
              <DeviceCard resource={r} key={r.id} />
            ))}
          </div>
          <div
            className={cn(
              "absolute w-full h-full bg-gradient-to-b from-transparent via-nb-gray-940/20 to-nb-gray-940 z-10 left-0 top-0 pointer-events-none",
              resources.length > 6 ? "opacity-100" : "opacity-0",
            )}
          ></div>
        </div>
      )}

      {/* Frame: routing status + install as one button group above it. */}
      {isDraft && isFrame && (
        <div
          // The button group must not drill into the frame.
          onClick={(e) => e.stopPropagation()}
          className={
            "absolute bottom-full left-0 mb-3 flex items-stretch rounded-md bg-nb-gray-920 border border-gray-700/40 overflow-hidden"
          }
        >
          <FullTooltip
            interactive={false}
            disabled={routingPeersCount === 0}
            content={
              <div className={"max-w-xs text-xs"}>
                {routingPeersCount >= 2 ? (
                  <>
                    High availability is{" "}
                    <span className={"text-green-500 font-medium"}>active</span>{" "}
                    for this network.
                    <div className={"inline-flex mt-2"}>
                      You can add more routing peers to increase the
                      availability of this network.
                    </div>
                  </>
                ) : (
                  <>
                    High availability is currently{" "}
                    <span className={"text-yellow-400 font-medium"}>
                      inactive
                    </span>{" "}
                    for this network.
                    <div className={"inline-flex mt-2"}>
                      Go ahead and add more routing peers or groups with routing
                      peers to enable high availability for this network.
                    </div>
                  </>
                )}
              </div>
            }
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRoutingPeerModal({ networkNodeId: id });
              }}
              className={
                "px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-nb-gray-910 transition-colors"
              }
            >
              <RoutingPeersIndicator
                count={routingPeersCount}
                dotSize={7}
                className={"gap-1.5"}
                zeroLabel={"No Routing Peers"}
                helpIcon={routingPeersCount > 0}
              />
            </button>
          </FullTooltip>
          <div className={"w-px bg-gray-700/40"} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRoutingPeerModal({ networkNodeId: id });
            }}
            className={
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-nb-gray-910 transition-colors whitespace-nowrap"
            }
          >
            <PlusCircleIcon size={13} />
            Add
          </button>
        </div>
      )}
      {isDraft && !isFrame && routingPeersCount === 0 && (
        <AddRoutingPeerButton networkNodeId={id} />
      )}

      {/* Anchors for the live network view's edges (card only). */}
      {!isFrame && (
        <>
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
        </>
      )}
      {isDraft && isFrame && (
        <ConnectHandle type={"source"} position={Position.Left} />
      )}
      {isDraft && <FullAreaTargetHandle isConnectable={isTarget} />}
    </div>
  );
};

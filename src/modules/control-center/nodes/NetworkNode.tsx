import useFetchApi from "@utils/api";
import { cn, singularize } from "@utils/helpers";
import {
  Handle,
  type Node,
  Position,
  useConnection,
  useStore,
} from "@xyflow/react";
import { CirclePlusIcon, NetworkIcon } from "lucide-react";
import {
  getRoutingPeerCount,
  RoutingPeersBar,
  RoutingPeersIndicator,
} from "@/modules/control-center/RoutingPeersBar";
import { useFrameRouterRows } from "@/modules/control-center/hooks/useFrameRouterRows";
import Button from "@components/Button";
import * as React from "react";
import { SmallBadge } from "@components/ui/SmallBadge";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useIsContextMenuTarget } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  useDraftMode,
  useNetworkHover,
} from "@/modules/control-center/draft/DraftModeContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";
import { MoreResourcesNode } from "@/modules/control-center/nodes/MoreResourcesNode";
import { NodeType } from "@/modules/control-center/utils/nodes";
import type { FrameMoreCell } from "@/modules/control-center/hooks/useNetworkFrameLayout";
import {
  DraftNetworkRef,
  getDraftResource,
  NETWORK_FRAME_HEADER,
} from "@/modules/control-center/utils/helpers";

type NetworkNodeType = {
  network: Network;
};

type NetworkNodeProps = Node<NetworkNodeType, "networkNode">;

// Renders as a FRAME (resources live inside as ReactFlow children, sized via
// the node style) or, in the live network view, as a card with a resource
// preview grid — see isFrame.
export const NetworkNode = ({ data, id }: NetworkNodeProps) => {
  const {
    isDraft,
    setRoutingPeerModal,
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
  } = useDraftMode();
  const { hoveredNetworkNodeId, setHoveredNetworkNodeId } = useNetworkHover();
  const isFrameHovered = hoveredNetworkNodeId === id;
  const isDrilled = drillDownNetworkNodeId === id;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode?.id !== id,
  );
  const showHalo = useIsContextMenuTarget(id);

  // Hovering the floating controls must neither highlight the frame nor
  // reveal its ConnectHandle — both key off the node's `group/node` hover,
  // which fires for any descendant.
  const [controlsHovered, setControlsHovered] = React.useState(false);

  const n = data.network as Network;
  // Frame-ness is an explicit flag (existing-network frames keep their real
  // id); the draft `network-new-` id is a built-in fallback. Live cards carry
  // neither.
  const isFrame =
    id.startsWith("network-new-") || !!(data as { frame?: boolean }).frame;

  // Draft members: resource nodes assigned to this network (by node id for
  // draft networks, API id otherwise). Store selector with value-equality, NOT
  // CanvasState — subscribing to the nodes array re-rendered every frame on
  // every canvas update (drag ticks, layout reconciles).
  const draftResources = useStore(
    (s) =>
      s.nodes
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
    (a, b) =>
      a.length === b.length &&
      a.every(
        (r, i) =>
          r.id === b[i].id &&
          r.name === b[i].name &&
          r.address === b[i].address &&
          r.type === b[i].type,
      ),
  );

  // Frames only need the count (from network.resources ids), so they skip this
  // SWR subscription entirely (one per frame on the networks overview).
  const { data: networkResources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
    false,
    true,
    !isFrame,
  );
  const resourceIds = n?.resources || [];
  const apiResources =
    networkResources?.filter((r) => resourceIds.includes(r?.id || "")) || [];
  const resources = [...apiResources, ...draftResources];
  const resourceCount = isFrame
    ? resourceIds.length + draftResources.length
    : resources.length;

  // Resource-group child rows have no draftNetwork ref (so they're not in
  // `resources`) but still occupy a grid cell and count toward the frame.
  const resourceGroupCount = useStore(
    (s) =>
      s.nodes.filter(
        (node) =>
          node.parentId === id && node.type === NodeType.ResourceGroupNode,
      ).length,
  );
  // Drives the header count and whether Add Resource is centered (empty) or a
  // bottom row (has content).
  const frameCellCount = resourceCount + resourceGroupCount;

  // Parent view caps visible cells; useNetworkFrameLayout hides the overflow
  // and returns the rect for a "+N more" cell in the last grid slot (cleared
  // while drilled, since drilling reveals everything).
  const moreCell = (data as { moreCell?: FrameMoreCell }).moreCell;

  // The frame's routers: draft create-router changes plus, for existing
  // networks, the API rows. ALL frames fetch their API rows LAZILY (first
  // popover open) — a routers GET per frame on mount lagged views with many
  // networks. Until loaded, the indicator combines routing_peers_count (from
  // /networks) with the draft-change rows, which need no fetch.
  const [routersRequested, setRoutersRequested] = React.useState(false);
  const { rows: routerRows, isLoading: routerRowsLoading } =
    useFrameRouterRows(id, isFrame && routersRequested);

  // Frames count peers, not routers (see getRoutingPeerCount); the live card
  // keeps the API count.
  const routingPeersCount = isFrame
    ? routersRequested && !routerRowsLoading
      ? getRoutingPeerCount(routerRows)
      : (n?.routing_peers_count ?? 0) + getRoutingPeerCount(routerRows)
    : n?.routing_peers_count ?? 0;

  return (
    <div
      onClick={
        isDraft && isFrame && !isDrilled
          ? () => setDrillDownNetworkNodeId(id)
          : undefined
      }
      className={cn(
        // transition-colors (not -all) so reparenting a resource — which
        // resizes the frame — snaps instead of animating the width/height.
        "relative transition-colors border bg-nb-gray-940",
        (data as { enabled?: boolean }).enabled === false && "opacity-60",
        isFrame
          ? "w-full h-full rounded-xl border border-nb-gray-800 group group/node"
          : "rounded-2xl border-nb-gray-900 overflow-hidden group hover:bg-nb-gray-935 cursor-pointer",
        isFrame && isFrameHovered && "border-nb-gray-700",
        isFrame && !isDrilled && "cursor-pointer",
        isDraft &&
          isTarget &&
          "hover:ring-2 hover:ring-white/60 hover:bg-nb-gray-930",
        // Drop indicator while dragging a resource onto the frame; set on the
        // node's data by useDragToGroup during the drag.
        isFrame &&
          (data as { dropTarget?: boolean }).dropTarget &&
          "border-white bg-nb-gray-930",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          cn(
            "w-full text-nb-gray-300 gap-2 text-sm pl-6 pr-6 py-3.5 font-normal bg-nb-gray-935 border-b border-nb-gray-800 transition-all rounded-t-[11px]",
            isFrame && isFrameHovered && "bg-nb-gray-930 border-nb-gray-700",
            !isFrame && "group-hover:bg-nb-gray-930",
            // Card with no resources has nothing below the header, so it
            // drops the separator; a frame keeps it (its body holds the
            // resource grid).
            !isFrame && resourceCount === 0 && "border-b-0",
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
            {/* NEW badge only for draft networks (no API id). */}
            {isFrame && !n?.id && <SmallBadge />}
          </div>
          <div className={cn("text-nb-gray-400 whitespace-nowrap mt-0.5")}>
            {resourceCount === 0
              ? "No Resources"
              : singularize("Resources", resourceCount, true)}
          </div>
        </div>
        {/* The frame's routing status + Add live in the floating group above
            it; the card keeps its inline routing count. */}
        {!isFrame && (
          <RoutingPeersIndicator
            count={routingPeersCount}
            className={"gap-2 text-xs shrink-0"}
          />
        )}
      </div>

      {/* Frame resources render as child NODES inside it (plus a "+N more" past
          the cap); the card previews its resources as a grid. */}
      {!isFrame && resources.length > 0 && (
        <div className={"px-2 flex flex-col gap-4 relative"}>
          <div className={"grid grid-cols-2 relative z-0"}>
            {resources.slice(0, 6).map((r) => (
              <DeviceCard resource={r} key={r.id} />
            ))}
          </div>
        </div>
      )}

      {/* Add Resource — always in a draft frame. Empty frames center it; with
          resources it's a full-width row pinned to the bottom band the layout
          reserves (the "+N more" footer stacks above it). */}
      {isFrame && (
        <FrameAddResourceButton
          id={id}
          frameCellCount={frameCellCount}
          setHoveredNetworkNodeId={setHoveredNetworkNodeId}
          setControlsHovered={setControlsHovered}
        />
      )}

      {/* Frame: routing-peers button group floating above it. Add is
          draft-only; live frames are read-only (click drills). */}
      {isFrame && (
        <div
          // Hovering the floating controls (DOM children of the node, so
          // ReactFlow's onNodeMouseEnter fires) must not highlight the frame.
          // ReactFlow fires enter outer→inner and leave inner→outer, so these
          // run after (enter) / before (leave) its handler and win.
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            setHoveredNetworkNodeId(null);
            setControlsHovered(true);
          }}
          onMouseLeave={() => {
            setHoveredNetworkNodeId(id);
            setControlsHovered(false);
          }}
          className={
            "absolute bottom-full -left-[2px] mb-3 flex items-stretch gap-2 nodrag"
          }
        >
          <RoutingPeersBar
            rows={routerRows}
            count={routingPeersCount}
            loading={routerRowsLoading}
            compact
            onOpenChange={(open) => open && setRoutersRequested(true)}
            onPrefetch={() => setRoutersRequested(true)}
            // Adds work in BOTH modes — live opens the real modal (POSTs),
            // draft records a change.
            onAdd={() => setRoutingPeerModal({ networkNodeId: id })}
          />
        </div>
      )}

      {/* Edge anchors for the live network view (cards and live frames — draft
          frames use FullAreaTargetHandle instead). */}
      {(!isFrame || !isDraft) && (
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
        <ConnectHandle
          type={"source"}
          position={Position.Left}
          hidden={controlsHovered}
        />
      )}
      {isDraft && <FullAreaTargetHandle isConnectable={isTarget} />}

      {/* Overflow "+N more" cell in the frame's last grid slot (positioned by
          useNetworkFrameLayout). Clicks bubble to the frame → drill in. */}
      {isFrame && !isDrilled && moreCell && (
        <MoreResourcesNode
          count={moreCell.count}
          style={{
            left: moreCell.x,
            top: moreCell.y - 1,
            width: moreCell.width,
            height: moreCell.height,
          }}
        />
      )}
    </div>
  );
};

// Split into its own component so LIVE frames never mount useDraftNodeCreation
// (it pulls useControlCenterData — six SWR subscriptions per frame).
const FrameAddResourceButton = ({
  id,
  frameCellCount,
  setHoveredNetworkNodeId,
  setControlsHovered,
}: {
  id: string;
  frameCellCount: number;
  setHoveredNetworkNodeId: (v: string | null) => void;
  setControlsHovered: (v: boolean) => void;
}) => {
  const { setResourceEditor } = useDraftMode();
  return (
    <div
      // Wrapper stays click-through (pointer-events-none) so dragging empty
      // frame content still moves the frame; only the button captures events
      // and blocks the drag (nodrag).
      className={cn(
        "absolute inset-x-0 bottom-0 pointer-events-none",
        frameCellCount === 0
          ? "flex items-center justify-center"
          : "px-5 pb-5",
      )}
      style={frameCellCount === 0 ? { top: NETWORK_FRAME_HEADER } : undefined}
    >
      <Button
        variant={"secondary"}
        size={"xs"}
        className={cn(
          "!px-3 !py-0 h-9 nodrag pointer-events-auto",
          frameCellCount > 0 && "w-full",
        )}
        // Open the resource modal so an IP/CIDR/domain is entered — the row is
        // created into the frame only once the modal saves. Clicks must not
        // bubble (live frame click drills).
        onClick={(e) => {
          e.stopPropagation();
          setResourceEditor({ createInNetworkNodeId: id });
        }}
        onMouseEnter={() => {
          setHoveredNetworkNodeId(null);
          setControlsHovered(true);
        }}
        onMouseLeave={() => {
          setHoveredNetworkNodeId(id);
          setControlsHovered(false);
        }}
      >
        <CirclePlusIcon size={12} />
        Add Resource
      </Button>
    </div>
  );
};

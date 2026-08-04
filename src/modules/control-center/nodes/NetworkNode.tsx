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

// One component, two variants: draft networks (no API id) render as a FRAME
// — dashed border, solid bg, resources living inside as ReactFlow children,
// sized via the node style. Existing networks (live network view) keep the
// card with the resource preview grid.
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
  // id), with the draft `network-new-` id as a built-in fallback. Live network
  // cards carry neither → they render as cards.
  const isFrame =
    id.startsWith("network-new-") || !!(data as { frame?: boolean }).frame;

  // Draft members: resource nodes assigned to this network via the editor or
  // drag-onto-network (matched by node id for draft networks, API id
  // otherwise).
  // Subscribed via a ReactFlow store selector with a value-based equality —
  // NOT the CanvasState context: subscribing to the nodes array re-rendered
  // every frame on every canvas update (drag ticks, layout reconciles).
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

  // Card preview needs the resource OBJECTS — frames only need the count
  // (from network.resources ids), so they skip this SWR subscription
  // entirely (one per frame added up on the networks overview).
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

  // Resource-group child nodes live in the frame as their own rows (no
  // draftNetwork ref, so they're not in `resources`); they still occupy a
  // grid cell and count toward the frame's contents like a resource does.
  const resourceGroupCount = useStore(
    (s) =>
      s.nodes.filter(
        (node) =>
          node.parentId === id && node.type === NodeType.ResourceGroupNode,
      ).length,
  );
  // Total cells the frame holds — drives the header count and whether the
  // "Add Resource" button is centered (empty) or a bottom row (has content).
  const frameCellCount = resourceCount + resourceGroupCount;

  // Parent view caps the frame's visible cells; useNetworkFrameLayout hides
  // the overflow and hands back the rect for a "+N more" cell in the last
  // grid slot (cleared while drilled, since drilling reveals everything).
  const moreCell = (data as { moreCell?: FrameMoreCell }).moreCell;

  // Routing-peers dropdown (frame's floating button): the frame's routers —
  // draft create-router changes plus, for existing networks, the API routers.
  // ALL frames (draft and live) fetch their API rows LAZILY (first popover
  // open): a routers GET per frame on mount noticeably lagged views with
  // many networks. Until the rows load, the indicator combines the API's
  // routing_peers_count (from /networks) with the draft-change rows, which
  // need no fetch.
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
      // Clicking the frame drills into the single-network view.
      onClick={
        isDraft && isFrame && !isDrilled
          ? () => setDrillDownNetworkNodeId(id)
          : undefined
      }
      className={cn(
        // transition-colors (not -all) so reparenting a resource — which
        // resizes the frame — snaps instead of animating the width/height.
        "relative transition-colors border bg-nb-gray-940",
        // All of the network's policies are disabled → the frame dims like
        // a disabled destination (its child rows dim via their own data).
        (data as { enabled?: boolean }).enabled === false && "opacity-60",
        isFrame
          ? "w-full h-full rounded-xl border border-nb-gray-800 group group/node"
          : "rounded-2xl border-nb-gray-900 overflow-hidden group hover:bg-nb-gray-935 cursor-pointer",
        isFrame && isFrameHovered && "border-nb-gray-700",
        isFrame && !isDrilled && "cursor-pointer",
        isDraft &&
          isTarget &&
          "hover:ring-2 hover:ring-white/60 hover:bg-nb-gray-930",
        // Drop indicator while dragging a resource card onto the frame (like
        // dropping a peer into a group): a white border. Set on the frame
        // node's data by useDragToGroup during the drag.
        isFrame &&
          (data as { dropTarget?: boolean }).dropTarget &&
          "border-white bg-nb-gray-930",
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
            {/* NEW badge only for draft networks — existing ones (live
                frames, dropped existing networks) already exist. */}
            {isFrame && !n?.id && <SmallBadge />}
          </div>
          <div className={cn("text-nb-gray-400 whitespace-nowrap mt-0.5")}>
            {resourceCount === 0
              ? "No Resources"
              : singularize("Resources", resourceCount, true)}
          </div>
        </div>
        {/* The frame's routing status + "Add" live in the floating button
            group above the frame; the card keeps its inline routing count. */}
        {!isFrame && (
          <RoutingPeersIndicator
            count={routingPeersCount}
            className={"gap-2 text-xs shrink-0"}
          />
        )}
      </div>

      {/* Body: the frame's resources (and, past the visible cap, a "+N more"
          row) render as child NODES inside it; the card previews its
          resources as a grid. */}
      {!isFrame && resources.length > 0 && (
        <div className={"px-2 flex flex-col gap-4 relative"}>
          <div className={"grid grid-cols-2 relative z-0"}>
            {resources.slice(0, 6).map((r) => (
              <DeviceCard resource={r} key={r.id} />
            ))}
          </div>
        </div>
      )}

      {/* "Add Resource" — always present in a draft frame. Empty frames center
          it; with resources it's a full-width row pinned to the bottom band
          the layout reserves (the "+N More" overflow footer stacks above it). */}
      {isFrame && (
        <FrameAddResourceButton
          id={id}
          frameCellCount={frameCellCount}
          setHoveredNetworkNodeId={setHoveredNetworkNodeId}
          setControlsHovered={setControlsHovered}
        />
      )}

      {/* Frame: routing-peers button group floating above the frame (left) —
          status pill + "Add" routing peer (Add is draft-only; live frames are
          read-only, click drills into the single-network view). */}
      {isFrame && (
        <div
          // The floating controls must not drill into the frame, and hovering
          // them (they're DOM children of the node, so ReactFlow's
          // onNodeMouseEnter fires) must not highlight the frame — suppress it
          // here and restore it when the pointer moves back onto the frame.
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
            onOpenChange={(open) => open && setRoutersRequested(true)}
            onPrefetch={() => setRoutersRequested(true)}
            // Adds work in BOTH modes — live opens the real routing-peer
            // modal (its save POSTs), draft records a change.
            onAdd={() => setRoutingPeerModal({ networkNodeId: id })}
          />
        </div>
      )}

      {/* Anchors for the live network view's edges (cards, and live frames —
          draft frames get their target from FullAreaTargetHandle instead). */}
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

      {/* Overflow: resources past the visible cap collapse into a "+N more"
          cell in the frame's last grid slot (positioned by
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

// Draft-only "Add Resource" button, split into its own component so LIVE
// frames never mount useDraftNodeCreation (it pulls useControlCenterData —
// six SWR subscriptions per frame, a real mount cost on the networks
// overview).
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
      // Wrapper spans the body but stays click-through (pointer-events-none)
      // so dragging on empty frame content still moves the frame; only the
      // button itself captures events and blocks the drag (nodrag).
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
        // Always open the resource modal (draft: pure-data; live: real
        // network) so an IP/CIDR/domain is entered — the row is only created
        // into the frame once the modal saves. Clicks must not bubble into
        // the frame (live frame click drills).
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

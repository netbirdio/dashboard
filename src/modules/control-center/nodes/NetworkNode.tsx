import Button from "@components/Button";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn, singularize } from "@utils/helpers";
import {
  Handle,
  type Node,
  Position,
  useConnection,
  useStore,
} from "@xyflow/react";
import { CirclePlusIcon, NetworkIcon } from "lucide-react";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useIsContextMenuTarget } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  useDraftMode,
  useNetworkHover,
} from "@/modules/control-center/draft/DraftModeContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";
import { useFrameRouterRows } from "@/modules/control-center/hooks/useFrameRouterRows";
import type { FrameMoreCell } from "@/modules/control-center/hooks/useNetworkFrameLayout";
import { MoreResourcesNode } from "@/modules/control-center/nodes/MoreResourcesNode";
import {
  getRoutingPeerCount,
  RoutingPeersBar,
} from "@/modules/control-center/panels/RoutingPeersBar";
import {
  DraftNetworkRef,
  getDraftResource,
  NETWORK_FRAME_HEADER,
} from "@/modules/control-center/utils/helpers";
import { NodeType } from "@/modules/control-center/utils/nodes";

type NetworkNodeType = {
  network: Network;
  enabled?: boolean;
  dropTarget?: boolean;
  moreCell?: FrameMoreCell;
};

type NetworkNodeProps = Node<NetworkNodeType, "networkNode">;

// Resources are ReactFlow child nodes; the frame is sized via the node style.
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

  // Hovering the floating controls must neither highlight the frame nor reveal
  // its ConnectHandle; both key off `group/node`, which any descendant fires.
  const [controlsHovered, setControlsHovered] = React.useState(false);

  const n = data.network as Network;

  // Store selector with value equality, NOT useCanvasState: subscribing to the
  // nodes array re-rendered every frame on every canvas update.
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

  const { changes } = useDraftChangeset();
  const { groups } = useGroups();

  // Pending delete-resource changes must lower the header count immediately;
  // the live id list still contains the doomed resources until deploy.
  const deletedResourceCount = React.useMemo(() => {
    const liveIds = new Set(n?.resources ?? []);
    return changes.filter(
      (c) => c.type === "delete-resource" && liveIds.has(c.resourceId),
    ).length;
  }, [changes, n?.resources]);

  // Only the count is needed, so no frame subscribes to /networks/resources:
  // that was one SWR subscription per frame on the networks overview.
  const resourceCount =
    Math.max(0, (n?.resources || []).length - deletedResourceCount) +
    draftResources.length;

  // Resource-group rows have no draftNetwork ref but still occupy a grid cell.
  const resourceGroupCount = useStore(
    (s) =>
      s.nodes.filter(
        (node) =>
          node.parentId === id && node.type === NodeType.ResourceGroupNode,
      ).length,
  );
  const frameCellCount = resourceCount + resourceGroupCount;

  // Rect computed by useNetworkFrameLayout; cleared while drilled.
  const moreCell = data.moreCell;

  // API router rows are fetched lazily on first popover open: a routers GET per
  // frame on mount lagged views with many networks.
  const [routersRequested, setRoutersRequested] = React.useState(false);
  const { rows: routerRows, isLoading: routerRowsLoading } =
    useFrameRouterRows(id, routersRequested);

  // A pending update-router that disables a live router must drop its peers from
  // the badge before the lazy rows fetch runs.
  const liveNetworkId = n?.id;
  const draftDisabledRouterPeers = React.useMemo(
    () =>
      changes.reduce((sum, c) => {
        if (c.type !== "update-router" || c.enabled !== false) return sum;
        if (!liveNetworkId || c.networkId !== liveNetworkId) return sum;
        if (c.peerId) return sum + 1;
        const group = groups?.find(
          (g) => g.id === c.groupId || g.name === c.groupId,
        );
        return sum + (group?.peers_count ?? 0);
      }, 0),
    [changes, groups, liveNetworkId],
  );

  // Frames count peers, not routers (see getRoutingPeerCount). Until the lazy fetch
  // delivers exact rows, the live count is overlaid with the draft's creates and disables.
  const routingPeersCount =
    routersRequested && !routerRowsLoading
      ? getRoutingPeerCount(routerRows)
      : Math.max(0, (n?.routing_peers_count ?? 0) - draftDisabledRouterPeers) +
        getRoutingPeerCount(routerRows);

  return (
    <div
      onClick={
        isDraft && !isDrilled ? () => setDrillDownNetworkNodeId(id) : undefined
      }
      className={cn(
        // transition-colors, not -all, so a frame resize snaps instead of
        // animating the width/height.
        "relative transition-colors border bg-nb-gray-940",
        data.enabled === false && "opacity-60",
        "w-full h-full rounded-xl border border-nb-gray-800 group group/node",
        isFrameHovered && "border-nb-gray-700",
        !isDrilled && "cursor-pointer",
        isDraft &&
          isTarget &&
          "hover:ring-2 hover:ring-white/60 hover:bg-nb-gray-930",
        // Set on the node's data by useDragToGroup during a drag.
        data.dropTarget && "border-white bg-nb-gray-930",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          "w-full text-nb-gray-300 gap-2 text-sm pl-6 pr-6 py-3.5 font-normal bg-nb-gray-935 border-b border-nb-gray-800 transition-all rounded-t-[11px]",
          isFrameHovered && "bg-nb-gray-930 border-nb-gray-700",
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
            {!n?.id && <SmallBadge />}
          </div>
          <div className={cn("text-nb-gray-400 whitespace-nowrap mt-0.5")}>
            {resourceCount === 0
              ? "No Resources"
              : singularize("Resources", resourceCount, true)}
          </div>
        </div>
      </div>

      {/* Empty frames center the button; with resources it's a full-width row
          in the bottom band the layout reserves. */}
      <FrameAddResourceButton
        id={id}
        frameCellCount={frameCellCount}
        setHoveredNetworkNodeId={setHoveredNetworkNodeId}
        setControlsHovered={setControlsHovered}
      />

      <div
        // ReactFlow fires enter outer→inner and leave inner→outer, so these run
        // after (enter) / before (leave) its own node handler and win.
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
          // Live opens the real modal; draft records a change.
          onAdd={() => setRoutingPeerModal({ networkNodeId: id })}
        />
      </div>

      {/* Draft frames use FullAreaTargetHandle instead. */}
      {!isDraft && (
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
      {isDraft && (
        <ConnectHandle
          type={"source"}
          position={Position.Left}
          hidden={controlsHovered}
        />
      )}
      {isDraft && <FullAreaTargetHandle isConnectable={isTarget} />}

      {/* Clicks bubble to the frame and drill in. */}
      {!isDrilled && moreCell && (
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

// Split out so live frames never mount useDraftNodeCreation, which pulls six
// SWR subscriptions per frame.
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
      // Click-through wrapper so dragging empty frame content still moves the
      // frame; only the button captures events and blocks the drag.
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
        // The row is created only once the modal saves. Clicks must not bubble;
        // a frame click drills in.
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

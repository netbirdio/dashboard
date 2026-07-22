import useFetchApi from "@utils/api";
import { cn, singularize } from "@utils/helpers";
import { Handle, type Node, Position, useConnection } from "@xyflow/react";
import { CirclePlusIcon, NetworkIcon } from "lucide-react";
import {
  getRoutingPeerCount,
  RoutingPeerRow,
  RoutingPeersBar,
  RoutingPeersIndicator,
  sortRoutingPeerRows,
} from "@/modules/control-center/RoutingPeersBar";
import Button from "@components/Button";
import * as React from "react";
import { SmallBadge } from "@components/ui/SmallBadge";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { usePeers } from "@/contexts/PeersProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { FullAreaTargetHandle } from "@/modules/control-center/handles/FullAreaTargetHandle";
import { MoreResourcesNode } from "@/modules/control-center/nodes/MoreResourcesNode";
import { NodeType } from "@/modules/control-center/utils/nodes";
import type { FrameMoreCell } from "@/modules/control-center/hooks/useNetworkFrameLayout";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
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
  const { data: networkResources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const {
    isDraft,
    setRoutingPeerModal,
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
    hoveredNetworkNodeId,
    setHoveredNetworkNodeId,
  } = useDraftMode();
  const { addResourceToFrame } = useDraftNodeCreation();
  const isFrameHovered = hoveredNetworkNodeId === id;
  const isDrilled = drillDownNetworkNodeId === id;
  const { nodes, edges, contextMenuNodeId } = useCanvasState();
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode?.id !== id;
  const showHalo = contextMenuNodeId === id;

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

  // Resource-group child nodes live in the frame as their own rows (no
  // draftNetwork ref, so they're not in `resources`); they still occupy a
  // grid cell and count toward the frame's contents like a resource does.
  const resourceGroupCount = React.useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.parentId === id && node.type === NodeType.ResourceGroupNode,
      ).length,
    [nodes, id],
  );
  // Total cells the frame holds — drives the header count and whether the
  // "Add Resource" button is centered (empty) or a bottom row (has content).
  const frameCellCount = resources.length + resourceGroupCount;

  // Parent view caps the frame's visible cells; useNetworkFrameLayout hides
  // the overflow and hands back the rect for a "+N more" cell in the last
  // grid slot (cleared while drilled, since drilling reveals everything).
  const moreCell = (data as { moreCell?: FrameMoreCell }).moreCell;

  // Draft routers: create-router changes for this network (routers have no
  // canvas representation — the count IS the state).
  const { changes } = useDraftChangeset();
  const clientId = id.replace("network-", "");
  const draftRouters = React.useMemo(
    () =>
      changes.filter(
        (c) =>
          c.type === "create-router" &&
          (c.networkClientId === clientId || (n?.id && c.networkId === n.id)),
      ),
    [changes, clientId, n?.id],
  );
  // Routing-peers dropdown (frame's floating button): lists the network's
  // routers — draft changes plus, for existing networks, the API routers.
  const { peers } = usePeers();
  const { groups } = useGroups();
  const { data: apiRouters } = useFetchApi<NetworkRouter[]>(
    `/networks/${n?.id}/routers`,
    false,
    false,
    isDraft && isFrame && !!n?.id,
  );

  const routerRows: RoutingPeerRow[] = React.useMemo(() => {
    const rows: RoutingPeerRow[] = [];
    (apiRouters ?? []).forEach((r) => {
      const peer = r.peer ? peers?.find((p) => p.id === r.peer) : undefined;
      const groupId = r.peer_groups?.[0];
      const group = groupId
        ? groups?.find((g) => g.id === groupId)
        : undefined;
      rows.push({
        key: `api-${r.id}`,
        peerOs: peer?.os,
        name: peer?.name ?? group?.name ?? "Routing Peer",
        isGroup: !r.peer,
        peersCount: !r.peer ? group?.peers_count ?? 0 : undefined,
        enabled: r.enabled,
      });
    });
    draftRouters.forEach((c) => {
      if (c.type !== "create-router") return;
      const peer = c.peerId
        ? peers?.find((p) => p.id === c.peerId)
        : undefined;
      const group = c.groupId
        ? groups?.find((g) => g.id === c.groupId || g.name === c.groupId)
        : undefined;
      rows.push({
        key: `draft-${c.id}`,
        peerOs: peer?.os,
        name: c.peerName ?? c.groupName ?? "Routing Peer",
        isGroup: !c.peerId,
        peersCount: !c.peerId ? group?.peers_count ?? 0 : undefined,
        enabled: c.enabled ?? true,
        // Draft routers open the routing-peer modal prefilled; the save
        // replaces the change.
        onEdit: () =>
          setRoutingPeerModal({ networkNodeId: id, editChangeId: c.id }),
      });
    });
    return sortRoutingPeerRows(rows);
  }, [apiRouters, draftRouters, peers, groups, id, setRoutingPeerModal]);

  // Frames count peers, not routers (see getRoutingPeerCount); the live card
  // keeps the API count.
  const routingPeersCount = isFrame
    ? getRoutingPeerCount(routerRows)
    : n?.routing_peers_count ?? 0;

  return (
    <div
      // Clicking the frame drills into the single-network view (§10).
      onClick={
        isDraft && isFrame && !isDrilled
          ? () => setDrillDownNetworkNodeId(id)
          : undefined
      }
      className={cn(
        // transition-colors (not -all) so reparenting a resource — which
        // resizes the frame — snaps instead of animating the width/height.
        "relative transition-colors border bg-nb-gray-940",
        isFrame
          ? "w-full h-full rounded-xl border border-nb-gray-800 group group/node"
          : "rounded-2xl border-nb-gray-900 overflow-hidden group hover:bg-nb-gray-935 cursor-pointer",
        isFrame && isFrameHovered && "border-nb-gray-700",
        isDraft && isFrame && !isDrilled && "cursor-pointer",
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
            !isFrame && resources.length === 0 && "border-b-0",
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
            {resources.length === 0
              ? "No Resources"
              : singularize("Resources", resources.length, true)}
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

      {/* "Add Resource" button — always present in a draft frame so resources
          can be added at any count. Empty frames center it in the body (auto
          width); once there are resources it's a full-width row pinned to the
          bottom band the layout reserves, and the "+N More" overflow footer
          (when resources overflow the visible cap) stacks just above it.
          Hovering it must not highlight the frame / reveal the ConnectHandle,
          same as the floating controls. */}
      {isDraft && isFrame && (
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
          style={
            frameCellCount === 0 ? { top: NETWORK_FRAME_HEADER } : undefined
          }
        >
          <Button
            variant={"secondary"}
            size={"xs"}
            className={cn(
              "!px-3 !py-0 h-9 nodrag pointer-events-auto",
              frameCellCount > 0 && "w-full",
            )}
            // Drops a blank resource row straight into the frame — same as
            // the context menu's "Add Resource" (the editor opens on click).
            onClick={() => addResourceToFrame(id)}
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
      )}

      {/* Frame: routing-peers button group floating above the frame (left) —
          status pill + "Add" routing peer. */}
      {isDraft && isFrame && (
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
            onAdd={() => setRoutingPeerModal({ networkNodeId: id })}
          />
        </div>
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

import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import {
  type Node,
  Position,
  useConnection,
  useStore,
} from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  RESOURCE_TYPE_ICONS,
  StandaloneResourceNode,
} from "@/modules/control-center/nodes/StandaloneResourceNode";
import { useIsContextMenuTarget } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftNetworkRef,
  getDraftResource,
  useAnySourceGroupEnabled,
} from "@/modules/control-center/utils/helpers";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

type ResourceNode = Node<
  {
    resource?: NetworkResource;
    peer?: Peer;
    enabled?: boolean;
    showHandles?: boolean;
    className?: string;
    draftNetwork?: DraftNetworkRef;
    // Force the standalone card look without a network ref (live
    // peer/group/user destinations).
    standalone?: boolean;
    // Live single-network view: network is named in the header, so suppress
    // the inline "- Network" suffix on the card.
    drilled?: boolean;
  },
  "resourceNode"
>;

export const ResourceNode = ({ data, id, parentId }: ResourceNode) => {
  const { enabled, resource, peer, showHandles = false, className } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(
    id,
    enabled !== undefined,
  );
  const isEnabled = enabled ?? sourceGroupEnabled;
  const { isDraft, setResourceEditor, drillDownNetworkNodeId } = useDraftMode();
  // Framed resources accept connection DROPS in every view; only dragging FROM
  // the resource stays drill-down-only in the parent view.
  const isFramed = !!parentId?.startsWith("network-");
  const handlesActive = !isFramed || drillDownNetworkNodeId === parentId;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );
  const showHalo = useIsContextMenuTarget(id);

  // Draft resources (resource-new-…) are edited on the canvas; incomplete ones
  // (no address yet) have no changeset entry.
  const isDraftResource = id.startsWith("resource-new-");
  const node = { id, data, position: { x: 0, y: 0 } } as Node;
  const draftResource = isDraftResource ? getDraftResource(node) : undefined;
  // Draft resources render their live-edited draft data, existing (dropped)
  // ones their API resource.
  const cardResource = draftResource ?? resource;

  // Standalone resources render as their own card; drilled frame children and
  // the live single-network view use the same card.
  // Drilled rendering keys off the parent frame being HIDDEN, not the drill id:
  // the id is set before the dive-in (frame still visible → keep rows) and
  // cleared before the exit fade finishes (frame still hidden → keep cards), so
  // the row↔card swap always happens while the canvas is invisible.
  // Boolean store selector, NOT useInternalNode — the internal lookup is
  // rebuilt every drag tick, and useInternalNode re-rendered EVERY framed
  // resource row per tick (the main drag lag with many network frames).
  const parentFrameHidden = useStore((st) =>
    parentId ? !!st.nodeLookup.get(parentId)?.hidden : false,
  );
  const isDrilledChild = isFramed && parentFrameHidden;
  const standaloneCard = isDraft
    ? !isFramed || isDrilledChild
    : !isFramed && (!!data.draftNetwork || !!data.standalone);
  if (cardResource && standaloneCard) {
    return (
      <StandaloneResourceNode
        id={id}
        data={data}
        // Drilled views name the network in the header; everywhere else it
        // shows inline after the name. Draft drill-down signals via the hidden
        // parent frame; the live single-network view carries an explicit
        // `drilled` flag (its resources are top-level nodes, not frame children).
        hideNetwork={isDrilledChild || !!data.drilled}
      />
    );
  }

  // A resource INSIDE a network frame: a flat row managed by the frame (no
  // card border/bg). The context-menu halo lives on the icon box here.
  if (cardResource && isFramed) {
    const Icon = RESOURCE_TYPE_ICONS[cardResource.type ?? "host"] ?? GlobeIcon;
    return (
      <div
        className={cn(
          "cc-frame-row relative rounded-lg transition-colors group/node w-full min-w-[185px]",
          // The frame layout stamps a fixed slot height on framed rows
          // (deterministic grid — no measure-based re-layout).
          "h-full flex flex-col justify-center",
          // Live rows keep the pointer (click drills into the network) but no
          // row hover styling — the frame highlights.
          "cursor-pointer",
          data.enabled === false && "opacity-60",
          className,
        )}
        onClick={() => {
          // Draft: clicking any framed resource opens the editor (the modal
          // resolves + prefills from the node id). Live rows drill into the
          // network via onNodeClick.
          if (isDraft) setResourceEditor({ nodeId: id });
        }}
      >
        <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
          <div
            className={cn(
              "cc-frame-row-icon h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 transition-all",
              "border border-nb-gray-850",
              "group-hover/node:text-nb-gray-200 group-hover/node:bg-nb-gray-700 group-hover/node:border-nb-gray-700",
              // Rings live on the icon box for framed rows: white while a
              // connection drag hovers, sky halo for the context menu.
              isTarget && "group-hover/node:ring-2 group-hover/node:ring-white",
              showHalo && "ring-2 ring-sky-500",
            )}
          >
            <Icon size={16} />
          </div>
          <div className={"flex flex-col gap-0 justify-center leading-tight "}>
            <span
              className={
                "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1 mt-1 relative top-[0.05rem]"
              }
            >
              <span className={"truncate max-w-[135px]"}>
                {cardResource.name}
              </span>
              {isDraftResource && <SmallBadge />}
            </span>
            <span
              className={
                "font-normal text-sm text-nb-gray-500 relative -top-[0.1rem]"
              }
            >
              {cardResource.address || "IP, CIDR or Domain"}
            </span>
          </div>
        </div>
        <AllHandles />
        {isDraft && showHandles && handlesActive && (
          <ConnectHandle type={"source"} position={Position.Left} />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer border rounded-lg overflow-hidden transition-all group/node",
        // standalone: the same card surface as PeerNode's card variant instead
        // of a transparent row.
        data.standalone
          ? "bg-nb-gray-940 border-nb-gray-850 pr-5 pl-3 h-[64px] flex items-center"
          : "border-transparent",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        className,
      )}
    >
      <DeviceCard
        resource={resource}
        device={peer}
        // w-auto for peers: match PeerNode's card variant, which sizes to
        // content rather than the fixed w-[200px].
        className={cn("p-0", !isEnabled && "opacity-60", peer && "w-auto")}
      />
      <AllHandles />
    </div>
  );
};

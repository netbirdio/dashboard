import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import {
  type Node,
  Position,
  useConnection,
  useInternalNode,
} from "@xyflow/react";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { StandaloneResourceNode } from "@/modules/control-center/nodes/StandaloneResourceNode";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
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
  },
  "resourceNode"
>;

const TYPE_ICONS = {
  domain: GlobeIcon,
  subnet: NetworkIcon,
  host: WorkflowIcon,
};

export const ResourceNode = ({ data, id, parentId }: ResourceNode) => {
  const { enabled, resource, peer, showHandles = false, className } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const { isDraft, setResourceEditor, drillDownNetworkNodeId } = useDraftMode();
  // Framed resources accept connection DROPS in every view — the drop
  // routes into the destination picker preselected with this resource. Only
  // dragging FROM the resource stays drill-down-only in the parent view.
  const isFramed = !!parentId?.startsWith("network-");
  const handlesActive = !isFramed || drillDownNetworkNodeId === parentId;
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const { contextMenuNodeId } = useCanvasState();
  const showHalo = contextMenuNodeId === id;

  // Draft resources (resource-new-…) are edited on the canvas via click /
  // context-menu Edit; incomplete ones (no address yet) show the dimmed
  // x.x.x.x placeholder and have no changeset entry.
  const isDraftResource = id.startsWith("resource-new-");
  const node = { id, data, position: { x: 0, y: 0 } } as Node;
  const draftResource = isDraftResource ? getDraftResource(node) : undefined;
  // The resource to render in the card — draft ones use their live-edited
  // draft data, existing (dropped) ones use their API resource.
  const cardResource = draftResource ?? resource;

  // Standalone draft/existing resource → its own card component (network shown
  // inline after the name; context-menu halo on the whole card). Drilled
  // frame children render as the same card — the drill-down mirrors the
  // standalone look, only the parent view keeps the flat rows. The LIVE
  // single-network view uses the card too (its resources carry a
  // draftNetwork ref so the network shows inline).
  // Drilled rendering keys off the parent frame being HIDDEN, not the drill
  // id: the id is set before the dive-in (frame still visible → keep rows)
  // and cleared before the exit fade finishes (frame still hidden → keep
  // cards). The swap between row and card thus always happens while the
  // canvas is invisible.
  const parentFrame = useInternalNode(parentId ?? "");
  const isDrilledChild = isFramed && !!parentFrame?.hidden;
  const standaloneCard = isDraft
    ? !isFramed || isDrilledChild
    : !isFramed && !!data.draftNetwork;
  if (cardResource && standaloneCard) {
    // Drilled views (draft drill-down, live single-network) already show the
    // network in the header — no inline "- Network" suffix on the card.
    return (
      <StandaloneResourceNode
        id={id}
        data={data}
        hideNetwork={isDrilledChild || !isDraft}
      />
    );
  }

  // A resource INSIDE a network frame: a flat row managed by the frame (no
  // card border/bg) — draft frames and live network frames alike. The
  // context-menu halo lives on the icon box here.
  if (cardResource && isFramed) {
    const Icon = TYPE_ICONS[cardResource.type ?? "host"] ?? GlobeIcon;
    return (
      <div
        className={cn(
          "relative rounded-lg transition-colors group/node w-full min-w-[185px]",
          // Live rows keep the pointer (clicking drills into the network like
          // the frame does) but no row hover styling — the frame highlights.
          "cursor-pointer",
          data.enabled === false && "opacity-60",
          className,
        )}
        onClick={() => {
          if (isDraftResource) setResourceEditor({ nodeId: id });
        }}
      >
        <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
          <div
            className={cn(
              "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 transition-all",
              "border border-nb-gray-850",
              isDraft &&
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
            {/* Address slot — dimmed placeholder until it's set. */}
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
        "cursor-pointer border border-transparent rounded-lg overflow-hidden transition-all group/node",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800",
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

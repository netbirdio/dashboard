import TruncatedText from "@components/ui/TruncatedText";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import { GlobeIcon, NetworkIcon, Settings2Icon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftNetworkRef,
  getDraftResource,
  isCompleteDraftResource,
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

export const ResourceNode = ({ data, id }: ResourceNode) => {
  const { enabled, resource, peer, showHandles = false, className } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const { isDraft, setResourceEditor } = useDraftMode();

  // Draft resources (resource-new-…) are edited on the canvas; incomplete
  // ones (no address/network yet) carry an amber "Set up" affordance and no
  // changeset entry.
  const isDraftResource = id.startsWith("resource-new-");
  const node = { id, data, position: { x: 0, y: 0 } } as Node;
  const isIncomplete = isDraftResource && !isCompleteDraftResource(node);
  const draftResource = isDraftResource ? getDraftResource(node) : undefined;

  // Draft resources mirror the placeholder-peer card: icon box, name row,
  // and the address slot dimmed to "x.x.x.x" until it's set. Click (or the
  // context menu's Edit) opens the resource editor. The single LEFT connect
  // handle drags into a policy — resources are destinations only, so they
  // sit right of policies.
  if (isDraftResource && draftResource) {
    const Icon = TYPE_ICONS[draftResource.type ?? "host"] ?? GlobeIcon;
    return (
      <div
        className={cn(
          "relative rounded-lg transition-all group/node border bg-nb-gray-940 border-nb-gray-900",
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 pr-5 pl-3 py-1 cursor-pointer",
          isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
          className,
        )}
        onClick={() => {
          if (isDraft) setResourceEditor({ nodeId: id });
        }}
      >
        {/* Incomplete draft resources need address + network before they can
            deploy — same floating-affordance pattern as the Install button. */}
        {isDraft && isIncomplete && (
          <div className={"absolute bottom-full left-0 mb-2"}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setResourceEditor({ nodeId: id });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs shrink-0 whitespace-nowrap",
                "bg-amber-900/40 border border-amber-500/30 text-amber-300",
                "hover:text-amber-100 hover:bg-amber-900/60 transition-colors",
              )}
            >
              <Settings2Icon size={13} />
              Set up
            </button>
          </div>
        )}
        <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
          <div
            className={
              "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-800 transition-all"
            }
          >
            <Icon size={16} />
          </div>
          <div className={"flex flex-col gap-0 justify-center leading-tight"}>
            <span
              className={
                "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1.5 mt-2"
              }
            >
              <TruncatedText
                text={draftResource.name}
                maxWidth={"150px"}
                hideTooltip
              />
              <SmallBadge />
            </span>
            {/* Address slot — dimmed placeholder until it's set. */}
            <span
              className={
                "font-normal text-sm text-nb-gray-500 relative -top-[0.3rem]"
              }
            >
              {draftResource.address || "x.x.x.x"}
            </span>
          </div>
        </div>
        <AllHandles />
        {isDraft && showHandles && (
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

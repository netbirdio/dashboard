import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { type Node, useConnection } from "@xyflow/react";
import { Settings2Icon } from "lucide-react";
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
  // Subtitle: address · parent network (once set).
  const displayResource = draftResource
    ? {
        ...draftResource,
        address: [draftResource.address, data.draftNetwork?.name]
          .filter(Boolean)
          .join(" · "),
      }
    : resource;

  return (
    <div
      className={cn(
        "cursor-pointer border border-transparent rounded-lg transition-all group/node relative",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800",
        isDraftResource && "bg-nb-gray-940 border-nb-gray-900",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        className,
      )}
      onClick={() => {
        if (isDraft && isDraftResource) setResourceEditor({ nodeId: id });
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
      <div className={"flex items-center"}>
        <DeviceCard
          resource={displayResource}
          device={peer}
          className={cn("p-0", !isEnabled && "opacity-60")}
        />
        {isDraftResource && (
          <div className={"pr-4 -ml-1"}>
            <SmallBadge />
          </div>
        )}
      </div>
      <AllHandles />
    </div>
  );
};

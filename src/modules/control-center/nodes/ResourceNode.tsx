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
    // Forces the standalone card look without a network ref.
    standalone?: boolean;
    // The network is named in the header, so suppress the inline suffix.
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
  // Dragging FROM a framed resource is drill-down-only; dropping onto it isn't.
  const isFramed = !!parentId?.startsWith("network-");
  const handlesActive = !isFramed || drillDownNetworkNodeId === parentId;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );
  const showHalo = useIsContextMenuTarget(id);

  const isDraftResource = id.startsWith("resource-new-");
  const node = { id, data, position: { x: 0, y: 0 } } as Node;
  const draftResource = isDraftResource ? getDraftResource(node) : undefined;
  const cardResource = draftResource ?? resource;

  // Boolean selector, NOT useInternalNode: that lookup is rebuilt every drag
  // tick, re-rendering every framed resource row.
  const parentFrameHidden = useStore((st) =>
    parentId ? !!st.nodeLookup.get(parentId)?.hidden : false,
  );
  // Keys off the frame being HIDDEN so the row↔card swap happens while the
  // canvas is invisible.
  const isDrilledChild = isFramed && parentFrameHidden;
  const standaloneCard = isDraft
    ? !isFramed || isDrilledChild
    : !isFramed && (!!data.draftNetwork || !!data.standalone);
  if (cardResource && standaloneCard) {
    return (
      <StandaloneResourceNode
        id={id}
        data={data}
        hideNetwork={isDrilledChild || !!data.drilled}
      />
    );
  }

  // A resource inside a network frame is a flat row managed by the frame.
  if (cardResource && isFramed) {
    const Icon = RESOURCE_TYPE_ICONS[cardResource.type ?? "host"] ?? GlobeIcon;
    return (
      <div
        className={cn(
          "cc-frame-row relative rounded-lg transition-colors group/node w-full min-w-[185px]",
          // The frame layout stamps a fixed slot height on framed rows.
          "h-full flex flex-col justify-center",
          "cursor-pointer",
          data.enabled === false && "opacity-60",
          className,
        )}
        onClick={() => {
          // Live rows drill into the network via onNodeClick instead.
          if (isDraft) setResourceEditor({ nodeId: id });
        }}
      >
        <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
          <div
            className={cn(
              "cc-frame-row-icon h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 transition-all",
              "border border-nb-gray-850",
              "group-hover/node:text-nb-gray-200 group-hover/node:bg-nb-gray-700 group-hover/node:border-nb-gray-700",
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
        // The same card surface as PeerNode's card variant, not a bare row.
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
        className={cn("p-0", !isEnabled && "opacity-60", peer && "w-auto")}
      />
      <AllHandles />
    </div>
  );
};

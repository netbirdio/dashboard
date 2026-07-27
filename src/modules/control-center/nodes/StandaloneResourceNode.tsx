import Button from "@components/Button";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import { AlertTriangleIcon, GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { useCanvasUI,
} from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftNetworkRef,
  getDraftResource,
} from "@/modules/control-center/utils/helpers";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

const TYPE_ICONS = {
  domain: GlobeIcon,
  subnet: NetworkIcon,
  host: WorkflowIcon,
};

type StandaloneResourceNodeData = {
  resource?: NetworkResource;
  showHandles?: boolean;
  enabled?: boolean;
  draftNetwork?: DraftNetworkRef;
};

// A STANDALONE draft resource (not inside a network frame): a card like the
// peer/group nodes. While unassigned it keeps a floating "No Network" control
// (top-left, alert) that opens the network picker; once assigned, the network
// shows inline after the name ("Name - Network", same color as the name, like
// the components panel). Dragging the card into a frame also assigns. New
// draft resources are editable and carry a NEW badge; existing dropped
// resources are read-only (v1). Unlike framed resource rows, the context-menu
// halo sits on the whole card, not the icon box.
export const StandaloneResourceNode = ({
  id,
  data,
  hideNetwork = false,
}: {
  id: string;
  data: StandaloneResourceNodeData;
  // Drilled views already show the network in the header — the inline
  // "- Network" suffix is redundant there.
  hideNetwork?: boolean;
}) => {
  const { showHandles = false } = data;
  const { isDraft, setResourceEditor, setResourceNetworkPicker } =
    useDraftMode();
  const { contextMenuNodeId } = useCanvasUI();
  const showHalo = contextMenuNodeId === id;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );

  const isDraftResource = id.startsWith("resource-new-");
  const node = { id, data, position: { x: 0, y: 0 } } as Node;
  const resource = isDraftResource ? getDraftResource(node) : data.resource;
  if (!resource) return null;

  const Icon = TYPE_ICONS[resource.type ?? "host"] ?? GlobeIcon;
  // In draft, both draft and existing standalone resources open the editor /
  // network picker on click (existing ones edit the canvas node only — v1
  // doesn't push updates to the API). The LIVE single-network view renders
  // the same card read-only.
  const editable = isDraft;
  // "Assigned" only once the ref points at a real network (id) or a draft
  // frame (clientId) — an empty ref still reads as "No Network".
  const network = data.draftNetwork;
  const hasNetwork = !!(network?.networkId || network?.networkClientId);

  return (
    <div
      className={cn(
        // min width matches NETWORK_FRAME_CHILD_WIDTH_MULTI so it doesn't
        // collapse below framed rows.
        "relative rounded-lg transition-colors group/node w-full min-w-[185px]",
        // Same card surface as the group node.
        "cursor-pointer border bg-nb-gray-940 border-nb-gray-850 hover:bg-nb-gray-930 hover:border-nb-gray-800 px-3 py-2.5",
        // Context-menu halo + connection-drop ring on the whole card.
        isTarget && "hover:ring-2 hover:ring-white",
        showHalo && "ring-2 ring-sky-500",
        data.enabled === false && "opacity-60",
      )}
      onClick={() => {
        if (editable) setResourceEditor({ nodeId: id });
      }}
    >
      {/* Unassigned resources keep the floating "No Network" control top-left
          (like the peer Install button) that opens the network picker. */}
      {!hasNetwork && editable && (
        <div className={"absolute bottom-full left-0 mb-3 nodrag"}>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"!px-3 !text-nb-gray-300"}
            onClick={(e) => {
              e.stopPropagation();
              setResourceNetworkPicker({ nodeId: id });
            }}
          >
            <AlertTriangleIcon size={12} className={"text-yellow-400"} />
            No network
          </Button>
        </div>
      )}
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={cn(
            "h-9 w-9 bg-nb-gray-850 group-hover/node:text-nb-gray-200 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-700 transition-all",
            "border border-nb-gray-850 group-hover/node:border-nb-gray-700",
          )}
        >
          <Icon size={16} />
        </div>
        <div className={"flex flex-col gap-0 justify-center leading-tight"}>
          <span
            className={
              "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-1.5 mb-1 mt-1 relative top-[0.05rem]"
            }
          >
            <span className={"truncate max-w-[120px]"}>{resource.name}</span>
            {/* Once assigned, the network shows inline after the name in the
                same color; clickable to reopen the picker for draft resources
                (existing resources can't be reassigned in v1). */}
            {hasNetwork && !hideNetwork && (
              <span
                className={cn(
                  "flex items-center gap-1.5 shrink-0",
                  isDraftResource && "cursor-pointer hover:text-nb-gray-300",
                )}
                onClick={(e) => {
                  if (!isDraftResource) return;
                  e.stopPropagation();
                  setResourceNetworkPicker({ nodeId: id });
                }}
              >
                <span>-</span>
                <span className={"truncate max-w-[90px]"}>{network!.name}</span>
              </span>
            )}
            {isDraftResource && <SmallBadge />}
          </span>
          <span
            className={
              "font-normal text-sm text-nb-gray-500 relative -top-[0.1rem]"
            }
          >
            {resource.address || "IP, CIDR or Domain"}
          </span>
        </div>
      </div>
      <AllHandles />
      {isDraft && showHandles && (
        <ConnectHandle type={"source"} position={Position.Left} />
      )}
    </div>
  );
};

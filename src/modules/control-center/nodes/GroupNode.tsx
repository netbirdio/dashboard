import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import * as React from "react";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

type GroupNodeProps = Node<
  {
    group: Group;
    enabled?: boolean;
    hoverable?: boolean;
    dropTarget?: boolean;
    showHandles?: boolean;
    onClick?: (g: Group) => void;
  },
  "groupNode"
>;

export const GroupNode = ({ data, id }: GroupNodeProps) => {
  const {
    enabled,
    group,
    hoverable = true,
    dropTarget,
    showHandles = false,
    onClick,
  } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const isNew = !group?.id;
  const { selectedDestinationGroup, contextMenuNodeId } = useCanvasState();
  const isPanelActive = !!group?.id && selectedDestinationGroup === group.id;
  const isContextMenuActive = contextMenuNodeId === id;
  const showHalo = isPanelActive || isContextMenuActive;

  const countLabel = useMemo(() => {
    const peerCount = group?.peers_count || 0;
    const resourceCount = group?.resources_count || 0;
    if (resourceCount === 0) {
      return `${peerCount} Peer(s)`;
    }
    if (peerCount === 0) {
      return `${resourceCount} Resource(s)`;
    }
    return `${peerCount} Peer(s), ${resourceCount} Resource(s)`;
  }, [group?.peers_count, group?.resources_count]);

  return (
    <div
      className={cn(
        "relative cc-group-node bg-nb-gray-940 border rounded-lg transition-all group/node",
        dropTarget
          ? "border-white ring-2 ring-white/20 bg-nb-gray-930"
          : "border-nb-gray-900",
        !isEnabled && "opacity-60",
        hoverable &&
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 cursor-pointer",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        showHalo && "ring-2 ring-sky-500",
      )}
      onClick={() => onClick?.(group)}
    >
      <div
        className={
          "flex w-full items-center justify-between text-nb-gray-300 gap-2 text-sm pl-3 pr-5 py-3 font-normal"
        }
      >
        <div className={"flex items-center gap-3 font-normal text-sm"}>
          <div
            className={
              "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"
            }
          >
            <GroupBadgeIcon id={group?.id} issued={group?.issued} size={14} />
          </div>
          <div>
            <div
              className={
                "flex items-center gap-2 text-nb-gray-200 font-normal whitespace-nowrap"
              }
            >
              {group.name}
              {isNew && <SmallBadge />}
            </div>
            <div className={"text-nb-gray-400 whitespace-nowrap text-xs"}>
              {countLabel}
            </div>
          </div>
        </div>
      </div>

      {showHandles ? (
        <>
          <AllHandles />
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
        </>
      ) : (
        <>
          <AllHandles />
        </>
      )}
    </div>
  );
};

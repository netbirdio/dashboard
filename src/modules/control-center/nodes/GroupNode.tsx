import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";

type GroupNodeProps = Node<
  {
    group: Group;
    enabled?: boolean;
    hoverable?: boolean;
    onClick?: (g: Group) => void;
  },
  "groupNode"
>;

export const GroupNode = ({ data, id }: GroupNodeProps) => {
  const { enabled, group, hoverable = true, onClick } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;

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
        "cc-group-node bg-nb-gray-940  border border-nb-gray-800 rounded-lg overflow-hidden transition-all",
        !isEnabled && "opacity-60",
        hoverable && "hover:bg-nb-gray-930 cursor-pointer",
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
            <div className={" text-nb-gray-200 font-normal whitespace-nowrap"}>
              {group.name}
            </div>
            <div className={"text-nb-gray-400 whitespace-nowrap text-xs"}>
              {countLabel}
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};

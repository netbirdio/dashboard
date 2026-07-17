import TruncatedText from "@components/ui/TruncatedText";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { getGroupCountLabel } from "@/modules/control-center/utils/helpers";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";

type ResourceGroupNode = Node<
  {
    group: Group;
    enabled?: boolean;
    showHandles?: boolean;
  },
  "resourceGroupNode"
>;

// A resource group shown INSIDE a network frame: same row anatomy as the
// draft resource node (icon box + name + count) but flat — no card
// background, border, or padding. Laid out by the frame like resources
// (fixed in place; dragging it moves the whole frame).
export const ResourceGroupNode = ({ data, id }: ResourceGroupNode) => {
  const { group, showHandles = true } = data;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const { isDraft } = useDraftMode();

  return (
    <div
      className={cn(
        "relative rounded-lg transition-all group/node w-full",
        isTarget && "ring-2 ring-white/60",
      )}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={
            "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-800 transition-all"
          }
        >
          <GroupBadgeIcon id={group?.id} issued={group?.issued} size={14} />
        </div>
        <div className={"flex flex-col gap-0 justify-center leading-tight"}>
          <span
            className={
              "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1.5 mt-2"
            }
          >
            <TruncatedText text={group?.name} maxWidth={"150px"} hideTooltip />
          </span>
          <span
            className={
              "font-normal text-sm text-nb-gray-500 relative -top-[0.3rem]"
            }
          >
            {getGroupCountLabel(group)}
          </span>
        </div>
      </div>
      {showHandles && (
        <>
          <AllHandles />
          {isDraft && (
            <ConnectHandle type={"source"} position={Position.Left} />
          )}
        </>
      )}
    </div>
  );
};

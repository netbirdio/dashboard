import Badge from "@components/Badge";
import { ScrollArea } from "@components/ScrollArea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import GroupBadge from "@components/ui/GroupBadge";
import PeerBadge from "@components/ui/PeerBadge";
import { cn } from "@utils/helpers";
import { orderBy } from "lodash";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  groups: Group[];
  label?: string;
  description?: string;
  onClick?: () => void;
  className?: string;
};

export default function MultipleGroups({
  groups,
  label = "Assigned Groups",
  description = "Use groups to control what this peer can access",
  onClick,
  className,
}: Readonly<Props>) {
  if (!groups) return <EmptyRow />;
  const orderedGroups = orderBy(groups, ["peers_count", "name"], ["desc"]);
  const firstGroup = orderedGroups.length > 0 ? orderedGroups[0] : undefined;
  const otherGroups = orderedGroups.length > 0 ? orderedGroups.slice(1) : [];

  return (
    <TooltipProvider
      disableHoverableContent={false}
      delayDuration={200}
      skipDelayDuration={200}
    >
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <div
            className={cn("inline-flex items-center gap-2 z-0", className)}
            data-cy={"multiple-groups"}
            onClick={onClick}
          >
            {firstGroup && <GroupBadge group={firstGroup} />}
            {otherGroups && otherGroups.length > 0 && (
              <Badge
                variant={"gray-ghost"}
                useHover={true}
                className={"px-3 gap-2 whitespace-nowrap"}
              >
                + {otherGroups.length}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {orderedGroups && orderedGroups.length > 0 && (
          <TooltipContent
            className={"p-0"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={"text-sm font-medium text-left px-5 pt-3"}>
              {label}
            </div>
            <ScrollArea
              className={
                "max-h-[285px] overflow-y-auto flex flex-col px-5 pt-3"
              }
            >
              <div className={"flex flex-col gap-2 items-start mb-2 last:pb-2"}>
                {orderedGroups.map((group) => {
                  return (
                    group && (
                      <div
                        key={group.id}
                        className={
                          "flex gap-2 items-center justify-between w-full"
                        }
                      >
                        <GroupBadge group={group}></GroupBadge>
                        <ArrowRightIcon size={14} />
                        <PeerBadge> {group.peers_count} Peer(s)</PeerBadge>
                      </div>
                    )
                  );
                })}
              </div>
            </ScrollArea>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

import Badge from "@components/Badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/HoverCard";
import { ScrollArea } from "@components/ScrollArea";
import GroupBadge from "@components/ui/GroupBadge";
import PeerCountBadge from "@components/ui/PeerCountBadge";
import ResourceCountBadge from "@components/ui/ResourceCountBadge";
import { cn } from "@utils/helpers";
import { ArrowRightIcon, PencilLineIcon } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";

type Props = {
  groups: Group[];
  label?: string;
  description?: string;
  onClick?: () => void;
  className?: string;
  showResources?: boolean;
  redirectGroupTab?: string;
  showUsers?: boolean;
  disableRedirect?: boolean;
};

export default function MultipleGroups({
  groups,
  label = "Assigned Groups",
  description = "Use groups to control what this peer can access",
  onClick,
  className,
  showResources = false,
  showUsers = false,
  redirectGroupTab,
  disableRedirect = false,
}: Readonly<Props>) {
  const { permission } = usePermissions();

  if (!groups || groups?.length === 0) return <EmptyRow />;
  const orderedGroups = groups.sort((a, b) => {
    if (a.name === "All") return 1;
    if (b.name === "All") return -1;
    const aPeerCount = a.peers_count ?? 0;
    const bPeerCount = b.peers_count ?? 0;
    if (aPeerCount !== bPeerCount) return bPeerCount - aPeerCount;
    return a.name.localeCompare(b.name);
  });
  const firstGroup = orderedGroups.length > 0 ? orderedGroups[0] : undefined;
  const otherGroups = orderedGroups.length > 0 ? orderedGroups.slice(1) : [];

  return (
    <div className={"flex"}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger>
          <div
            className={cn("inline-flex items-center gap-2 z-0", className)}
            data-cy={"multiple-groups"}
            onClick={onClick}
          >
            {firstGroup && (
              <GroupBadge
                group={firstGroup}
                showNewBadge={true}
                className={
                  permission.groups.update ? "group-hover:bg-nb-gray-800" : ""
                }
              />
            )}
            {otherGroups && otherGroups.length > 0 && (
              <Badge
                variant={"gray-ghost"}
                useHover={true}
                className={cn(
                  "px-3 gap-2 whitespace-nowrap",
                  permission.groups.update ? "group-hover:bg-nb-gray-800" : "",
                )}
              >
                + {otherGroups.length}
              </Badge>
            )}
          </div>
        </HoverCardTrigger>
        {orderedGroups && orderedGroups.length > 0 && (
          <HoverCardContent
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
                        key={group?.id || group?.name}
                        className={
                          "flex gap-2 items-center justify-between w-full"
                        }
                      >
                        <GroupBadge
                          group={group}
                          className={"py-0"}
                          textClassName={"py-1.5"}
                          showNewBadge={true}
                          redirectToGroupPage={!disableRedirect}
                          redirectGroupTab={redirectGroupTab}
                        ></GroupBadge>
                        <ArrowRightIcon size={14} />
                        {showResources ? (
                          <ResourceCountBadge
                            group={group}
                            disableRedirect={disableRedirect}
                          />
                        ) : showUsers ? (
                          <UserCountStack group={group} />
                        ) : (
                          <PeerCountBadge
                            group={group}
                            disableRedirect={disableRedirect}
                          />
                        )}
                      </div>
                    )
                  );
                })}
              </div>
            </ScrollArea>
          </HoverCardContent>
        )}
      </HoverCard>
    </div>
  );
}

export const TransparentEditIconButton = () => {
  return (
    <div
      className={
        "h-[34px] w-[34px] !p-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-nb-gray-400 hover:text-nb-gray-100"
      }
    >
      <PencilLineIcon size={16} />
    </div>
  );
};

export const UserCountStack = ({ group }: { group: Group }) => {
  const { users } = useUsers();
  const usersOfGroup =
    users?.filter((user) => user.auto_groups.includes(group.id as string)) ||
    [];
  return (
    <HorizontalUsersStack
      users={usersOfGroup}
      side={"right"}
      isAllGroup={group?.name === "All"}
    />
  );
};

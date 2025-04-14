import Badge from "@components/Badge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { EyeIcon, FolderGit2, SquarePen } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { AssignPeerToGroupModal } from "@/modules/groups/AssignPeerToGroupModal";

type Props = {
  group: Group;
  className?: string;
  showNewBadge?: boolean;
  showPeerCount?: boolean;
  useSave?: boolean;
  onPeerAssignmentChange?: (oldGroup: Group, newGroup: Group) => void;
};

export default function GroupBadgeWithEditPeers({
  group,
  className,
  showNewBadge = false,
  useSave = true,
  onPeerAssignmentChange,
}: Readonly<Props>) {
  const isNew = !group?.id;
  const [editGroupPeersModal, setEditGroupPeersModal] = useState(false);
  const { dropdownOptions, addDropdownOptions, updateGroupDropdown } =
    useGroups();

  const currentGroup = useMemo(() => {
    return dropdownOptions?.find((g) => g.name === group?.name);
  }, [group, dropdownOptions]);

  const peerCount =
    currentGroup?.peers?.length ?? currentGroup?.peers_count ?? 0;

  const updateGroupOptions = (g: Group) => {
    updateGroupDropdown(group.name, g);
    onPeerAssignmentChange?.(group, g);
  };

  const isAllGroup = currentGroup?.name === "All";

  return (
    <>
      {currentGroup && editGroupPeersModal && (
        <AssignPeerToGroupModal
          useSave={useSave}
          group={currentGroup}
          onUpdate={(g) => updateGroupOptions(g)}
          open={editGroupPeersModal}
          setOpen={setEditGroupPeersModal}
        />
      )}

      <Badge
        key={group.id ?? group.name}
        useHover={true}
        variant={"gray-ghost"}
        className={cn(
          "transition-all group group/badge whitespace-nowrap overflow-hidden",
          className,
        )}
        onClick={(e) => {
          if (!currentGroup) return;
          e.stopPropagation();
          setEditGroupPeersModal(true);
        }}
      >
        <div
          className={
            "flex flex-col items-start justify-start pt-[0px] pb-[2px]"
          }
        >
          <div
            className={
              "text-gray-700 dark:text-nb-gray-200 flex gap-1.5 items-center z-10 relative"
            }
          >
            <FolderGit2 size={12} className={"shrink-0"} />
            <TextWithTooltip text={group?.name || ""} maxChars={20} />
            {isNew && showNewBadge && (
              <span
                className={
                  "text-[7px] relative -top-[0px] leading-[0] bg-green-900 border border-green-500/20 py-1.5 px-1 rounded-[3px] text-green-400"
                }
              >
                NEW
              </span>
            )}
          </div>
          <span
            className={
              "text-[0.7rem] relative leading-none mt-[2px] text-gray-500 dark:text-nb-gray-300 mb-[1px] font-normal flex gap-1.5 items-center group-hover/badge:text-netbird transition-all"
            }
          >
            <span>
              <span
                className={
                  "font-medium text-gray-600 dark:text-nb-gray-200 group-hover/badge:text-netbird transition-all"
                }
              >
                {peerCount}
              </span>{" "}
              Peers{" "}
            </span>
            {isAllGroup ? (
              <EyeIcon size={11} className={"shrink-0"} />
            ) : (
              <SquarePen
                size={11}
                className={
                  "shrink-0 transition-all relative z-10 group-hover/badge:text-netbird text-netbird-400/80"
                }
              />
            )}
          </span>
        </div>
      </Badge>
    </>
  );
}

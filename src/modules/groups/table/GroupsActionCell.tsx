import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { FolderIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { GROUP_TOOLTIP_TEXT } from "@/interfaces/Group";
import { GroupUsage } from "@/modules/groups/useGroupsUsage";

type Props = {
  group: GroupUsage;
  inUse: boolean;
};

export default function GroupsActionCell({ group, inUse }: Readonly<Props>) {
  const { permission } = usePermissions();
  const router = useRouter();

  const {
    deleteGroup,
    isAllowedToRename,
    isAllowedToDelete,
    isIntegrationGroup,
    isJWTGroup,
    openGroupRenameModal,
  } = useGroupContext();

  const canDelete = isAllowedToDelete && !inUse;

  return (
    <>
      <div
        className={cn(
          "flex justify-end pr-4 gap-3",
          group.name === "All" && "pointer-events-none opacity-0",
        )}
      >
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <Button variant={"secondary"} className={"!px-3"}>
              <MoreVertical size={16} className={"shrink-0"} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-auto" align="end">
            <DropdownMenuItem
              onClick={() => router.push("/group?id=" + group.id)}
              disabled={!permission.groups.read}
            >
              <div className="flex gap-3 items-center">
                <FolderIcon size={14} className="shrink-0" />
                View Details
              </div>
            </DropdownMenuItem>

            {permission?.groups?.update && (
              <>
                <DropdownMenuSeparator />
                <FullTooltip
                  content={
                    <div className={"text-xs max-w-xs"}>
                      {isJWTGroup
                        ? GROUP_TOOLTIP_TEXT.RENAME.JWT
                        : GROUP_TOOLTIP_TEXT.RENAME.INTEGRATION}
                    </div>
                  }
                  interactive={false}
                  disabled={isAllowedToRename}
                  className={"w-full block"}
                >
                  <DropdownMenuItem
                    onClick={openGroupRenameModal}
                    disabled={!isAllowedToRename}
                  >
                    <div className="flex gap-3 items-center">
                      <Pencil size={14} className="shrink-0" />
                      Rename
                    </div>
                  </DropdownMenuItem>
                </FullTooltip>
              </>
            )}
            {permission?.groups?.delete && (
              <FullTooltip
                content={
                  <div className={"text-xs max-w-xs"}>
                    {isIntegrationGroup
                      ? GROUP_TOOLTIP_TEXT.DELETE.INTEGRATION
                      : GROUP_TOOLTIP_TEXT.IN_USE}
                  </div>
                }
                interactive={false}
                disabled={canDelete}
                className={"w-full block"}
              >
                <DropdownMenuItem
                  onClick={deleteGroup}
                  variant={"danger"}
                  disabled={!canDelete}
                >
                  <div className="flex gap-3 items-center">
                    <Trash2 size={14} className="shrink-0" />
                    Delete
                  </div>
                </DropdownMenuItem>
              </FullTooltip>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

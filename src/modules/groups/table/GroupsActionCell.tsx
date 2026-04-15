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
import { useI18n } from "@/i18n/I18nProvider";
import { GroupUsage } from "@/modules/groups/useGroupsUsage";

type Props = {
  group: GroupUsage;
  inUse: boolean;
};

export default function GroupsActionCell({ group, inUse }: Readonly<Props>) {
  const { permission } = usePermissions();
  const router = useRouter();
  const { t } = useI18n();

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
                {t("actions.viewDetails")}
              </div>
            </DropdownMenuItem>

            {permission?.groups?.update && (
              <>
                <DropdownMenuSeparator />
                <FullTooltip
                  content={
                    <div className={"text-xs max-w-xs"}>
                      {isJWTGroup
                        ? t("groups.actionRenameDisabledJwt")
                        : t("groups.actionRenameDisabledIntegration")}
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
                      {t("actions.rename")}
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
                      ? t("groups.actionDeleteDisabledIntegration")
                      : t("groups.actionDeleteDisabled")}
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
                    {t("actions.delete")}
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

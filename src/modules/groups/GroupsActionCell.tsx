import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { FolderIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";
import { GroupUsage } from "@/modules/settings/useGroupsUsage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { EditGroupNameModal } from "./EditGroupNameModal";

type Props = {
  group: GroupUsage;
  in_use: boolean;
};
export default function GroupsActionCell({ group, in_use }: Readonly<Props>) {
  const { permission } = usePermissions();
  const router = useRouter();
  const { confirm } = useDialog();
  const groupRequest = useApiCall<SetupKey>("/groups/" + group.id);
  const { mutate } = useSWRConfig();
  const [groupNameModal, setGroupNameModal] = useState(false);
  const handleRevoke = async () => {
    notify({
      title: "Group: " + group.name,
      description: "Group was successfully deleted.",
      promise: groupRequest.del().then(() => {
        mutate("/groups");
      }),
      loadingMessage: "Deleting the group...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${group.name}'?`,
      description:
        "Are you sure you want to delete this group? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  const { isRegularGroup, isJWTGroup } = useGroupIdentification({
    id: group?.id,
    issued: group?.issued,
  });
  const isDisabled = useMemo(() => {
    //todo : @Eduard can you check the logic here for group rename
    let del = true;
    let rename = true;

    // Delete logic
    if (permission.groups.delete) del = false;
    if (in_use) del = true;
    if (isJWTGroup) del = false;
    if (!isRegularGroup) del = true;

    // Rename logic
    if (permission.groups.update) rename = false;
    if (isJWTGroup) rename = true; // maybe JWT groups can't be renamed?
    if (!isRegularGroup) rename = true;

    return { del, rename };
  }, [permission, in_use, isJWTGroup, isRegularGroup]);

  const getDisabledText = (action: "delete" | "rename") => {
    //todo : @Eduard can you check the logic here for group rename
    if (action === "delete") {
      if (isRegularGroup) {
        return "Remove dependencies to this group to delete it.";
      } else if (isJWTGroup) {
        return "This group is issued by JWT and cannot be deleted.";
      } else {
        return "This group is issued by an IdP and cannot be deleted.";
      }
    }

    if (action === "rename") {
      if (isJWTGroup) {
        return "This group is issued by JWT and cannot be renamed.";
      } else if (!isRegularGroup) {
        return "This group is issued by an IdP and cannot be renamed.";
      } else {
        return "";
      }
    }

    return "";
  };

  const onGroupNameUpdate = (name: string) => {
    notify({
      title: "Group: " + group.name,
      description: "Group was successfully Rename.",
      promise: groupRequest.put({ name: name }).then(() => {
        mutate("/groups");
      }),
      loadingMessage: "Renaming the group...",
    });
    setGroupNameModal(false);
  };

  return (
    <>
      {groupNameModal && (
        <EditGroupNameModal
          initialName={group.name}
          open={groupNameModal}
          onOpenChange={setGroupNameModal}
          onSuccess={onGroupNameUpdate}
        />
      )}
      <div className={"flex justify-end pr-4 gap-3"}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
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

            <DropdownMenuSeparator />
            <FullTooltip
              content={<div className={"text-xs max-w-xs"}>{getDisabledText('rename')}</div>}
              interactive={false}
              disabled={!isDisabled.rename}
              className={"w-full block"}
            >
              <DropdownMenuItem
                onClick={() => setGroupNameModal(true)}
                disabled={isDisabled.rename}
              >
                <div className="flex gap-3 items-center">
                  <Pencil size={14} className="shrink-0" />
                  Edit Name
                </div>
              </DropdownMenuItem>
            </FullTooltip>
            <FullTooltip
              content={<div className={"text-xs max-w-xs"}>{getDisabledText('delete')}</div>}
              interactive={false}
              disabled={!isDisabled.del}
              className={"w-full block"}
            >
              <DropdownMenuItem
                onClick={handleConfirm}
                variant={"danger"}
                disabled={isDisabled.del}
              >
                <div className="flex gap-3 items-center">
                  <Trash2 size={14} className="shrink-0" />
                  Delete
                </div>
              </DropdownMenuItem>
            </FullTooltip>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

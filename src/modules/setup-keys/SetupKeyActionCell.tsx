import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { MoreVertical, Trash2, Undo2Icon } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyActionCell({ setupKey }: Readonly<Props>) {
  const { confirm } = useDialog();
  const request = useApiCall<SetupKey>("/setup-keys/" + setupKey.id);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const canRevoke =
    !setupKey.revoked && setupKey.valid && permission.setup_keys.update;
  const canDelete = permission.setup_keys.delete;

  const handleRevoke = async () => {
    const choice = await confirm({
      title: `Revoke '${setupKey?.name || "Setup Key"}'?`,
      description:
        "Are you sure you want to revoke the setup key? This action cannot be undone.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: setupKey?.name || "Setup Key",
      description: "Setup key was successfully revoked",
      promise: request
        .put({
          name: setupKey?.name || "Setup Key",
          type: setupKey.type,
          expires_in: setupKey.expires_in,
          revoked: true,
          auto_groups: setupKey.auto_groups,
          usage_limit: setupKey.usage_limit,
          ephemeral: setupKey.ephemeral,
          allow_extra_dns_labels: setupKey.allow_extra_dns_labels,
        })
        .then(() => {
          mutate("/setup-keys");
          mutate("/groups");
        }),
      loadingMessage: "Revoking the setup key...",
    });
  };

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${setupKey?.name || "Setup Key"}'?`,
      description:
        "Are you sure you want to delete the setup key? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: setupKey?.name || "Setup Key",
      description: "Setup key was successfully deleted",
      promise: request.del().then(() => {
        mutate("/setup-keys");
        mutate("/groups");
      }),
      loadingMessage: "Deleting the setup key...",
    });
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            aria-label={"Open actions menu"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem
            onClick={handleRevoke}
            disabled={!canRevoke}
            variant={"danger"}
          >
            <div className={"flex gap-3 items-center"}>
              <Undo2Icon size={14} className={"shrink-0"} />
              Revoke
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!canDelete}
            variant={"danger"}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2, Undo2Icon } from "lucide-react";
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
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleRevoke}
        disabled={
          setupKey.revoked || !setupKey.valid || !permission.setup_keys.update
        }
      >
        <Undo2Icon size={16} />
        Revoke
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleDelete}
        disabled={!permission.setup_keys.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

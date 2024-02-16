import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyActionCell({ setupKey }: Props) {
  const { confirm } = useDialog();
  const deleteRequest = useApiCall<SetupKey>("/setup-keys/" + setupKey.id);
  const { mutate } = useSWRConfig();

  const handleRevoke = async () => {
    notify({
      title: "Setup Key: " + setupKey.name,
      description: "Setup key was successfully revoked",
      promise: deleteRequest
        .put({
          name: setupKey.name,
          type: setupKey.type,
          expires_in: setupKey.expires_in,
          revoked: true,
          auto_groups: setupKey.auto_groups,
          usage_limit: setupKey.usage_limit,
          ephemeral: setupKey.ephemeral,
        })
        .then(() => {
          mutate("/setup-keys");
          mutate("/groups");
        }),
      loadingMessage: "Revoking the setup key...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Revoke '${setupKey.name}'?`,
      description:
        "Are you sure you want to revoke the setup key? This action cannot be undone.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
        disabled={setupKey.revoked || !setupKey.valid}
      >
        <Trash2 size={16} />
        Revoke
      </Button>
    </div>
  );
}

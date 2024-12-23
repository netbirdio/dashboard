import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useUserContext } from "@/contexts/UserProvider";
import { AccessToken } from "@/interfaces/AccessToken";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  access_token: AccessToken;
};
export default function AccessTokenActionCell({ access_token }: Props) {
  const { user } = useUserContext();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const deleteRequest = useApiCall<SetupKey>(
    `/users/${user.id}/tokens/${access_token.id}`,
  );

  const handleRevoke = async () => {
    notify({
      title: access_token.name,
      description: "Access token was successfully deleted",
      promise: deleteRequest.del().then(() => {
        mutate(`/users/${user.id}/tokens`);
      }),
      loadingMessage: "Deleting the access token...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${access_token.name}'?`,
      description:
        "Are you sure you want to delete this token? This action cannot be undone.",
      confirmText: "Delete",
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
        data-cy={"access-token-delete"}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { User } from "@/interfaces/User";
import { UserResendInviteButton } from "@/modules/users/UserResendInviteButton";

type Props = {
  user: User;
  serviceUser?: boolean;
};
export default function UserActionCell({
  user,
  serviceUser = false,
}: Readonly<Props>) {
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const deleteRule = async () => {
    const name = user.name || "User";
    notify({
      title: `'${name}' deleted`,
      description: "User was successfully deleted.",
      promise: userRequest.del("", `/${user.id}`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: "Deleting the user...",
    });
  };

  const openConfirm = async () => {
    const name = user.name || "User";
    const choice = await confirm({
      title: `Delete '${name}'?`,
      description:
        "Deleting this user will remove their devices and remove dashboard access. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    deleteRule().then();
  };

  const disabled = useMemo(() => {
    if (!permission.users.delete) return true;
    return user.is_current;
  }, [permission.users.delete, user.is_current]);

  return (
    <div className={"flex justify-end pr-4 items-center gap-4"}>
      {!serviceUser && isNetBirdHosted() && (
        <UserResendInviteButton user={user} />
      )}
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={openConfirm}
        data-cy={"delete-user"}
        disabled={disabled}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

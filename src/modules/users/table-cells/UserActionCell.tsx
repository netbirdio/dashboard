import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import { CheckCircle, Trash2, XCircle } from "lucide-react";
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

  const approveUser = async () => {
    const name = user.name || "User";
    notify({
      title: `'${name}' approved`,
      description: "User was successfully approved.",
      promise: userRequest.post("", `/${user.id}/approve`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: "Approving the user...",
    });
  };

  const rejectUser = async () => {
    const name = user.name || "User";
    const choice = await confirm({
      title: `Reject '${name}'?`,
      description:
        "Rejecting this user will remove them from the account permanently. This action cannot be undone.",
      confirmText: "Reject",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    
    notify({
      title: `'${name}' rejected`,
      description: "User was successfully rejected and removed.",
      promise: userRequest.del("", `/${user.id}/reject`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: "Rejecting the user...",
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

  const isPendingApproval = user.pending_approval;
  const canManageUsers = permission.users.update;

  return (
    <div className={"flex justify-end pr-4 items-center gap-2"}>
      {!serviceUser && isNetBirdHosted() && !isPendingApproval && (
        <UserResendInviteButton user={user} />
      )}
      
      {isPendingApproval && canManageUsers && (
        <>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"h-[32px]"}
            onClick={approveUser}
            data-cy={"approve-user"}
          >
            Approve
          </Button>
          <Button
            variant={"danger-outline"}
            size={"sm"}
            onClick={rejectUser}
            data-cy={"reject-user"}
          >
            <XCircle size={16} />
            Reject
          </Button>
        </>
      )}
      
      {!isPendingApproval && (
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
      )}
    </div>
  );
}

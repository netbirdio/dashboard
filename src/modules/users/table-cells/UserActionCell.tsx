import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import { Trash2, XCircle } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { t } = useI18n();
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const deleteRule = async () => {
    const name = user.name || t("userActions.userFallback");
    notify({
      title: t("userActions.deletedTitle", { name }),
      description: t("userActions.deletedDescription"),
      promise: userRequest.del("", `/${user.id}`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: t("userActions.deleting"),
    });
  };

  const approveUser = async () => {
    const name = user.name || t("userActions.userFallback");
    notify({
      title: t("userActions.approvedTitle", { name }),
      description: t("userActions.approvedDescription"),
      promise: userRequest.post({}, `/${user.id}/approve`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: t("userActions.approving"),
    });
  };

  const rejectUser = async () => {
    const name = user.name || t("userActions.userFallback");
    const choice = await confirm({
      title: t("userActions.rejectConfirmTitle", { name }),
      description: t("userActions.rejectConfirmDescription"),
      confirmText: t("userActions.reject"),
      cancelText: t("actions.cancel"),
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return;

    notify({
      title: t("userActions.rejectedTitle", { name }),
      description: t("userActions.rejectedDescription"),
      promise: userRequest.del("", `/${user.id}/reject`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),

      loadingMessage: t("userActions.rejecting"),
    });
  };

  const openConfirm = async () => {
    const name = user.name || t("userActions.userFallback");
    const choice = await confirm({
      title: t("userActions.deleteConfirmTitle", { name }),
      description: t("userActions.deleteConfirmDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      maxWidthClass: "max-w-md",
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
            onClick={approveUser}
            data-cy={"approve-user"}
          >
            {t("userActions.approve")}
          </Button>
          <Button
            variant={"danger-outline"}
            size={"xs"}
            className={"!px-3"}
            onClick={rejectUser}
            data-cy={"reject-user"}
          >
            <XCircle size={14} />
            {t("userActions.reject")}
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
          {t("actions.delete")}
        </Button>
      )}
    </div>
  );
}

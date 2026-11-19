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
import { isNetBirdCloud } from "@utils/netbird";
import { Ban, MoreVertical, Trash2, UndoIcon, XCircle } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
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
  const t = useTranslations();
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const deleteUser = async () => {
    const name = user.name || "User";
    notify({
      title: `'${name}' deleted`,
      description: t("users.userDeletedDesc"),
      promise: userRequest.del("", `/${user.id}`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: t("users.deletingUser"),
    });
  };

  const approveUser = async () => {
    const name = user.name || "User";
    notify({
      title: `'${name}' approved`,
      description: t("users.userApprovedDesc"),
      promise: userRequest.post({}, `/${user.id}/approve`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: t("users.approvingUser"),
    });
  };

  const rejectUser = async () => {
    const name = user.name || t("common.user");
    const choice = await confirm({
      title: t("users.rejectNamedTitle", { name }),
      description:
        t("users.rejectUserDesc"),
      confirmText: t("users.reject"),
      cancelText: t("common.cancel"),
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return;

    notify({
      title: `'${name}' rejected`,
      description: t("users.userRejectedDesc"),
      promise: userRequest.del("", `/${user.id}/reject`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),

      loadingMessage: t("users.rejectingUser"),
    });
  };

  const openDeleteConfirm = async () => {
    const name = user.name || t("common.user");
    const choice = await confirm({
      title: t("users.deleteNamedTitle", { name }),
      description:
        t("users.deleteUserDesc"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      maxWidthClass: "max-w-md",
      type: "danger",
    });
    if (!choice) return;
    deleteUser().then();
  };

  const toggleBlocked = async () => {
    const name = user.name || t("common.user");
    const blocked = !user.is_blocked;

    if (blocked) {
      const choice = await confirm({
        title: t("users.blockNamedTitle", { name }),
        description:
          t("users.blockUserDesc"),
        confirmText: t("users.block"),
        cancelText: t("common.cancel"),
        type: "danger",
      });
      if (!choice) return;
    }

    notify({
      title: blocked ? t("users.userBlockedNotify") : t("users.userUnblockedNotify"),
      description:
        name + " was successfully " + (blocked ? "blocked." : "unblocked."),
      promise: userRequest
        .put(
          {
            role: user.role,
            auto_groups: user.auto_groups,
            is_blocked: blocked,
          },
          `/${user.id}`,
        )
        .then(() => {
          mutate(`/users?service_user=${serviceUser}`);
        }),
      loadingMessage: blocked
        ? t("users.blockingUser")
        : t("users.unblockingUser"),
    });
  };

  const deleteDisabled = useMemo(() => {
    if (!permission.users.delete) return true;
    return user.is_current;
  }, [permission.users.delete, user.is_current]);

  const isPendingApproval = user.pending_approval;
  const canManageUsers = permission.users.update;
  const canShowBlock =
    !serviceUser && !user.is_current && user.role !== "owner";
  const blockDisabled = !canManageUsers;

  if (isPendingApproval) {
    return (
      <div className={"flex justify-end pr-4 items-center gap-2"}>
        {canManageUsers && (
          <>
            <Button
              variant={"secondary"}
              size={"xs"}
              onClick={(e) => {
                e.stopPropagation();
                approveUser();
              }}
              data-cy={"approve-user"}
            >
              {t("users.approve")}
            </Button>
            <Button
              variant={"danger-outline"}
              size={"xs"}
              className={"!px-3"}
              onClick={(e) => {
                e.stopPropagation();
                rejectUser();
              }}
              data-cy={"reject-user"}
            >
              <XCircle size={14} />
              {t("users.reject")}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={"flex justify-end pr-4 items-center gap-2"}>
      {!serviceUser && isNetBirdCloud() && (
        <UserResendInviteButton user={user} />
      )}
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
            aria-label={t("users.userActions")}
            data-testid={"user-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          {canShowBlock && (
            <>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBlocked();
                }}
                disabled={blockDisabled}
                variant={user.is_blocked ? undefined : "danger"}
                data-cy={user.is_blocked ? "unblock-user" : "block-user"}
              >
                <div className={"flex gap-3 items-center"}>
                  {user.is_blocked ? (
                    <UndoIcon size={14} className={"shrink-0"} />
                  ) : (
                    <Ban size={14} className={"shrink-0"} />
                  )}
                  {user.is_blocked ? t("users.unblock") : t("users.block")}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openDeleteConfirm();
            }}
            disabled={deleteDisabled}
            variant={"danger"}
            data-cy={"delete-user"}
            data-testid={"delete-user"}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {t("common.delete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

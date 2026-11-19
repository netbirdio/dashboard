import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  isUserPage?: boolean;
};
export default function UserBlockCell({ user, isUserPage = false }: Props) {
  const t = useTranslations();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();

  const isChecked = useMemo(() => {
    return user.is_blocked;
  }, [user]);

  const disabled = user.is_current || user.role === "owner";

  const update = async (blocked: boolean) => {
    const name = user.name || "User";

    if (blocked) {
      const choice = await confirm({
        title: `Block '${name}'?`,
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
          mutate(`/users?service_user=false`);
          if (isUserPage) mutate(`/users`);
        }),
      loadingMessage: blocked
        ? t("users.blockingUser")
        : t("users.unblockingUser"),
    });
  };

  if (user?.pending_approval) return;

  return !disabled ? (
    <div className={"flex"}>
      <ToggleSwitch
        disabled={!permission.users.update}
        variant={"red"}
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  ) : null;
}

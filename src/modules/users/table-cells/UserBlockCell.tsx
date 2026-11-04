import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import { useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  isUserPage?: boolean;
};
export default function UserBlockCell({ user, isUserPage = false }: Props) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();

  const isChecked = useMemo(() => {
    return user.is_blocked;
  }, [user]);

  const disabled = user.is_current || user.role === "owner";

  const update = async (blocked: boolean) => {
    const name = user.name || t("user");

    if (blocked) {
      const choice = await confirm({
        title: t("blockUserTitle", { name }),
        description: t("blockUserDesc"),
        confirmText: t("blockButton"),
        cancelText: tCommon("cancel"),
        type: "danger",
      });
      if (!choice) return;
    }

    notify({
      title: blocked ? t("userBlockedNotify") : t("userUnblockedNotify"),
      description: blocked
        ? t("blockedSuccess", { name })
        : t("unblockedSuccess", { name }),
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
        ? t("blockingUser")
        : t("unblockingUser"),
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

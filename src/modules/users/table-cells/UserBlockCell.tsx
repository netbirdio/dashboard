import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  isUserPage?: boolean;
};
export default function UserBlockCell({ user, isUserPage = false }: Props) {
  const { t } = useI18n();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();

  const isChecked = useMemo(() => {
    return user.is_blocked;
  }, [user]);

  const disabled = user.is_current || user.role === "owner";

  const update = async (blocked: boolean) => {
    const name = user.name || t("userActions.userFallback");

    if (blocked) {
      const choice = await confirm({
        title: t("userBlock.confirmTitle", { name }),
        description: t("userBlock.confirmDescription"),
        confirmText: t("postureChecks.block"),
        cancelText: t("actions.cancel"),
        type: "danger",
      });
      if (!choice) return;
    }

    notify({
      title: blocked ? t("userBlock.blockedTitle") : t("userBlock.unblockedTitle"),
      description: blocked
        ? t("userBlock.blockedDescription", { name })
        : t("userBlock.unblockedDescription", { name }),
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
        ? t("userBlock.blocking")
        : t("userBlock.unblocking"),
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

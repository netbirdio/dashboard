import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  isUserPage?: boolean;
};
export default function UserBlockCell({ user, isUserPage = false }: Props) {
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const isChecked = useMemo(() => {
    return user.is_blocked;
  }, [user]);

  const disabled = user.is_current || user.role === "owner";

  const update = async (blocked: boolean) => {
    notify({
      title: blocked ? "User blocked" : "User unblocked",
      description:
        user.name +
        " was successfully " +
        (blocked ? "blocked." : "unblocked."),
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
        ? "Blocking the user..."
        : "Unblocking the user...",
    });
  };

  return !disabled ? (
    <div className={"flex"}>
      <ToggleSwitch
        variant={"red"}
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  ) : null;
}

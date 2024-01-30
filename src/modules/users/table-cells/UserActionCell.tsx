import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
  serviceUser?: boolean;
};
export default function UserActionCell({ user, serviceUser = false }: Props) {
  const { confirm } = useDialog();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const deleteRule = async () => {
    notify({
      title: user.name + "deleted",
      description: "User was successfully deleted.",
      promise: userRequest.del("", `/${user.id}`).then(() => {
        mutate(`/users?service_user=${serviceUser}`);
      }),
      loadingMessage: "Deleting the user...",
    });
  };

  const openConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${user.name}'?`,
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
    return user.is_current || user.role === "owner";
  }, [user]);

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={openConfirm}
        disabled={disabled}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

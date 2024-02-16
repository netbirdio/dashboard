import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckActionCell = ({ check }: Props) => {
  const deleteRequest = useApiCall("/posture-checks");
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${check.name}'?`,
      description:
        "Are you sure you want to delete this posture check? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (choice) {
      notify({
        title: check.name,
        description: "Posture check was successfully deleted",
        promise: deleteRequest.del({}, `/${check.id}`).then(() => {
          mutate("/posture-checks").then();
        }),
        loadingMessage: "Deleting posture check...",
      });
    }
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button variant={"danger-outline"} size={"sm"} onClick={handleDelete}>
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
};

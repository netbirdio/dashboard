import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverActionCell({ ns }: Props) {
  const { confirm } = useDialog();
  const nsRequest = useApiCall<NameserverGroup>("/dns/nameservers");
  const { mutate } = useSWRConfig();

  const deleteRule = async () => {
    notify({
      title: "Nameserver " + ns.name,
      description: "The nameserver was successfully removed.",
      promise: nsRequest.del("", `/${ns.id}`).then(() => {
        mutate("/dns/nameservers");
      }),
      loadingMessage: "Deleting the nameserver...",
    });
  };

  const openConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${ns.name}'?`,
      description:
        "Are you sure you want to delete this nameserver? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    deleteRule().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button variant={"danger-outline"} size={"sm"} onClick={openConfirm}>
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

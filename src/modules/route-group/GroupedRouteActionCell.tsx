import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { GroupedRoute, Route } from "@/interfaces/Route";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteActionCell({ groupedRoute }: Props) {
  const { permission } = usePermissions();

  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();

  const handleRevoke = async () => {
    if (!groupedRoute.routes) return Promise.resolve();
    const batch = groupedRoute.routes.map((route) => {
      if (route.id) return routeRequest.del("", `/${route.id}`);
      return Promise.resolve(route);
    });

    notify({
      title: "Delete Network " + groupedRoute.network_id,
      description: "Network was successfully removed",
      promise: Promise.all(batch).then(() => {
        mutate("/routes");
      }),
      loadingMessage: "Deleting the network...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Delete network '${groupedRoute.network_id}'?`,
      description:
        "Are you sure you want to delete this network? All routes inside this network will be deleted. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
        disabled={!permission.routes.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

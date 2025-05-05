import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { PenSquare, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Route } from "@/interfaces/Route";
import RouteUpdateModal from "@/modules/routes/RouteUpdateModal";

type Props = {
  route: Route;
};
export default function RouteActionCell({ route }: Props) {
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();
  const [editModal, setEditModal] = useState(false);

  const handleRevoke = async () => {
    notify({
      title: "Delete Route " + route.network_id,
      description: "Route was successfully removed",
      promise: routeRequest.del("", `/${route.id}`).then(() => {
        mutate("/routes");
      }),
      loadingMessage: "Deleting the route...",
    });
  };

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Delete '${route.network_id}'?`,
      description:
        "Are you sure you want to delete this route? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRevoke().then();
  };

  return (
    <div className={"flex justify-end pr-4"}>
      {editModal && (
        <RouteUpdateModal
          route={route}
          open={editModal}
          onOpenChange={setEditModal}
        />
      )}
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => setEditModal(true)}
        disabled={!permission.routes.update}
      >
        <PenSquare size={16} />
        Edit
      </Button>
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

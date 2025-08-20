import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};

export default function RouteAutoApplyCell({ route }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { updateRoute } = useRoutes();
  const { mutate } = useSWRConfig();

  const isExitNode = useMemo(() => route.network === "0.0.0.0/0", [route]);

  const isChecked = useMemo(() => {
    // Checked means Auto Apply is ON, which maps to skip_auto_apply === false
    return route.skip_auto_apply === false;
  }, [route]);

  const update = async (checked: boolean) => {
    // When toggled ON (checked === true), we want skip_auto_apply = false
    const nextSkipAutoApply = !checked;
    updateRoute(
      route,
      { skip_auto_apply: nextSkipAutoApply },
      () => {
        mutate("/routes");
      },
      checked
        ? "Auto Apply was enabled for the route"
        : "Auto Apply was disabled for the route",
    );
  };

  if (!isExitNode) return null;

  return (
    <div className={"flex items-center"}>
      <ToggleSwitch
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
        disabled={!permission.routes.update}
      />
    </div>
  );
}



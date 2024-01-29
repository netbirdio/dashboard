import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function RouteActiveCell({ route }: Props) {
  const { updateRoute } = useRoutes();
  const { mutate } = useSWRConfig();

  const update = async (enabled: boolean) => {
    updateRoute(
      route,
      { enabled },
      () => {
        mutate("/routes");
      },
      enabled
        ? "The network route was successfully enabled"
        : "The network route was successfully disabled",
    );
  };

  const isChecked = useMemo(() => {
    return route.enabled;
  }, [route]);

  return (
    <div className={"flex"}>
      <ToggleSwitch
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  );
}

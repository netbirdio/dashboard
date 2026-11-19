import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function RouteActiveCell({ route }: Readonly<Props>) {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { updateRoute } = useRoutes();
  const { mutate } = useSWRConfig();

  const update = async (enabled: boolean) => {
    updateRoute(
      route,
      { enabled },
      () => {
        mutate("/routes");
      },
      enabled ? t("peer.routeEnabled") : t("peer.routeDisabled"),
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
        disabled={!permission.routes.update}
      />
    </div>
  );
}

import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function RouteActiveCell({ route }: Readonly<Props>) {
  const { t } = useI18n();
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
      enabled
        ? t("peerRouteActions.enabled")
        : t("peerRouteActions.disabled"),
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

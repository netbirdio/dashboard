import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { NETWORKS_ACTIVE_ROUTES } from "@/modules/navigation/sections";

export const NetworkNavigation = () => {
  const t = useTranslations();
  const { permission } = usePermissions();
  return (
    <SidebarItem
      icon={<NetworkRoutesIcon />}
      label={t("common.networkRouting")}
      collapsible
      visible={permission.networks.read || permission.routes.read}
    >
      <SidebarItem
        label={t("common.networks")}
        isChild
        href={"/networks"}
        exactPathMatch={true}
        activeRoutes={NETWORKS_ACTIVE_ROUTES}
        visible={permission.networks.read}
      />
      <SidebarItem
        label={t("common.routes")}
        isChild
        href={"/network-routes"}
        exactPathMatch={true}
        visible={permission.routes.read}
      />
    </SidebarItem>
  );
};

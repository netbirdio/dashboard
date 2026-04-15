import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";

import { useI18n } from "@/i18n/I18nProvider";

export const NetworkNavigation = () => {
  const { t } = useI18n();
  const { permission } = usePermissions();
  return (
    <>
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        label={t("networks.title")}
        href={"/networks"}
        visible={permission.networks.read}
      />
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        href={"/network-routes"}
        label={t("networkRoutesPage.title")}
        visible={permission.routes.read}
      />
    </>
  );
};

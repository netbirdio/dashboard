import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import { useTranslations } from "next-intl";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const NetworkNavigation = () => {
  const t = useTranslations("navigation");
  const { permission } = usePermissions();
  return (
    <SidebarItem
      icon={<NetworkRoutesIcon />}
      label={t("networkRouting")}
      collapsible
      visible={permission.networks.read || permission.routes.read}
    >
      <SidebarItem
        label={t("networks")}
        isChild
        href={"/networks"}
        exactPathMatch={true}
        visible={permission.networks.read}
      />
      <SidebarItem
        label={t("routes")}
        isChild
        href={"/network-routes"}
        exactPathMatch={true}
        visible={permission.routes.read}
      />
    </SidebarItem>
  );
};

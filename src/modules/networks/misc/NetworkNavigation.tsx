import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const NetworkNavigation = () => {
  const { permission } = usePermissions();
  return (
    <>
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        label={"Networks"}
        href={"/networks"}
        visible={permission.networks.read}
      />
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        href={"/network-routes"}
        label={"Network Routes"}
        visible={permission.routes.read}
      />
    </>
  );
};

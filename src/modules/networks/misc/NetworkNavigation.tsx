import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const NetworkNavigation = () => {
  const { permission } = usePermissions();
  return (
    <SidebarItem
      icon={<NetworkRoutesIcon />}
      label={"Network Routing"}
      collapsible
      visible={permission.networks.read || permission.routes.read}
    >
      <SidebarItem
        label={"Networks"}
        isChild
        href={"/networks"}
        exactPathMatch={true}
        visible={permission.networks.read}
      />
      <SidebarItem
        label={"Routes"}
        isChild
        href={"/network-routes"}
        exactPathMatch={true}
        visible={permission.routes.read}
      />
    </SidebarItem>
  );
};

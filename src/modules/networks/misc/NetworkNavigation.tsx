import SidebarItem from "@components/SidebarItem";
import { SmallBadge } from "@components/ui/SmallBadge";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NETWORKS_ACTIVE_ROUTES } from "@/modules/navigation/sections";

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
        activeRoutes={NETWORKS_ACTIVE_ROUTES}
        visible={permission.networks.read}
      />
      <SidebarItem
        label={"Routes"}
        isChild
        href={"/network-routes"}
        exactPathMatch={true}
        visible={permission.routes.read}
      />
      <SidebarItem
        label={
          <div className={"flex items-center gap-2"}>
            Exit Nodes
            <SmallBadge
              text={"New"}
              variant={"sky"}
              className={"text-[8px] leading-none py-[3px] px-[5px]"}
              textClassName={"top-0"}
            />
          </div>
        }
        isChild
        href={"/exit-nodes"}
        exactPathMatch={true}
        visible={permission.routes.read}
      />
    </SidebarItem>
  );
};

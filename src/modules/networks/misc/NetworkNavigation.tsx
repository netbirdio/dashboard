import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { NetworkRoutesDeprecationInfo } from "@/modules/networks/misc/NetworkRoutesDeprecationInfo";

export const NetworkNavigation = () => {
  return (
    <SidebarItem
      icon={<NetworkRoutesIcon />}
      label="Networks"
      collapsible
      exactPathMatch={false}
    >
      <SidebarItem label="Networks" isChild href={"/networks"} />
      <SidebarItem
        label={
          <div className={"flex items-center"}>
            Network Routes
            <NetworkRoutesDeprecationInfo />
          </div>
        }
        isChild
        href={"/network-routes"}
      />
    </SidebarItem>
  );
};

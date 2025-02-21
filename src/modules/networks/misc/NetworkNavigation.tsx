import SidebarItem from "@components/SidebarItem";
import { SmallBadge } from "@components/ui/SmallBadge";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";

export const NetworkNavigation = () => {
  return (
    <>
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        label={
          <div className={"flex items-center gap-2"}>
            Networks
            <SmallBadge />
          </div>
        }
        href={"/networks"}
      />
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        href={"/network-routes"}
        label={"Network Routes"}
      />
    </>
  );
};

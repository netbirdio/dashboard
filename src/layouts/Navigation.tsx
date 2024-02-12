"use client";

import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import { CustomFlowbiteTheme, Sidebar } from "flowbite-react";
import { SidebarItemGroupProps } from "flowbite-react/lib/esm/components/Sidebar/SidebarItemGroup";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DocsIcon from "@/assets/icons/DocsIcon";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import SidebarItem from "@/components/SidebarItem";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const customTheme: CustomFlowbiteTheme["sidebar"] = {
  root: {
    inner: "bg-gray-50 dark:bg-nb-gray",
  },
};

type Props = {
  fullWidth?: boolean;
  hideOnMobile?: boolean;
};

export default function Navigation({
  fullWidth = false,
  hideOnMobile = false,
}: Props) {
  const { isUser } = useLoggedInUser();

  return (
    <Sidebar
      className={cn(
        "whitespace-nowrap md:border-r dark:border-zinc-700/40",
        hideOnMobile ? "hidden md:block" : "",
        fullWidth
          ? "w-auto max-w-[22rem]"
          : "w-[14rem] min-w-[14rem] overflow-y-auto",
      )}
      theme={customTheme}
      style={{
        height: fullWidth ? "calc(100vh - 75px)" : "100%",
      }}
    >
      <Sidebar.Items className={cn(fullWidth ? "w-10/12" : "fixed")}>
        <ScrollArea
          style={{
            height: !fullWidth ? "calc(100vh - 75px)" : "100%",
          }}
          className={"pt-4"}
        >
          <SidebarItemGroup>
            <SidebarItem icon={<PeerIcon />} label="Peers" href={"/peers"} />

            {!isUser && (
              <>
                <SidebarItem
                  icon={<SetupKeysIcon />}
                  label="Setup Keys"
                  href={"/setup-keys"}
                />
                <SidebarItem
                  icon={<AccessControlIcon />}
                  label="Access Control"
                  href={"/access-control"}
                />
                <SidebarItem
                  icon={<NetworkRoutesIcon />}
                  label="Network Routes"
                  href={"/network-routes"}
                />
                <SidebarItem
                  icon={<DNSIcon />}
                  label="DNS"
                  collapsible
                  exactPathMatch={true}
                >
                  <SidebarItem
                    label="Nameservers"
                    isChild
                    href={"/dns/nameservers"}
                  />
                  <SidebarItem
                    label="DNS Settings"
                    isChild
                    href={"/dns/settings"}
                  />
                </SidebarItem>
                <SidebarItem icon={<TeamIcon />} label="Team" collapsible>
                  <SidebarItem label="Users" isChild href={"/team/users"} />
                  <SidebarItem
                    label="Service Users"
                    isChild
                    href={"/team/service-users"}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<ActivityIcon />}
                  label="Activity"
                  href={"/activity"}
                />
              </>
            )}

            {isUser && (
              <SidebarItem
                icon={<DocsIcon />}
                href={"https://docs.netbird.io/"}
                target={"_blank"}
                label="Documentation"
              />
            )}
          </SidebarItemGroup>

          {!isUser && (
            <SidebarItemGroup>
              <SidebarItem
                icon={<SettingsIcon />}
                label="Settings"
                href={"/settings"}
                exactPathMatch={true}
              />

              {(isLocalDev() || isNetBirdHosted()) && (
                <SidebarItem
                  icon={<IntegrationIcon />}
                  label="Integrations"
                  href={"/integrations"}
                  exactPathMatch={true}
                />
              )}

              <SidebarItem
                icon={<DocsIcon />}
                href={"https://docs.netbird.io/"}
                target={"_blank"}
                label="Documentation"
              />
            </SidebarItemGroup>
          )}
        </ScrollArea>
      </Sidebar.Items>
    </Sidebar>
  );
}

export function SidebarItemGroup(props: SidebarItemGroupProps) {
  return (
    <Sidebar.ItemGroup className={"dark:border-zinc-700/40"} {...props}>
      {props.children}
    </Sidebar.ItemGroup>
  );
}

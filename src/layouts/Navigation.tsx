"use client";

import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { CustomFlowbiteTheme, Sidebar } from "flowbite-react";
import { SidebarItemGroupProps } from "flowbite-react/lib/esm/components/Sidebar/SidebarItemGroup";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DocsIcon from "@/assets/icons/DocsIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import SidebarItem from "@/components/SidebarItem";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { headerHeight } from "@/layouts/Header";

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
  const { bannerHeight } = useAnnouncement();

  return (
    <Sidebar
      className={cn(
        "whitespace-nowrap md:border-r dark:border-zinc-700/40",
        hideOnMobile ? "hidden md:block" : "",
        fullWidth
          ? "w-auto max-w-[22rem]"
          : "w-[15rem] max-w-[15rem] min-w-[15rem] overflow-y-auto",
      )}
      theme={customTheme}
      style={{
        height: fullWidth
          ? `calc(100vh - ${headerHeight + bannerHeight}px)`
          : "100%",
      }}
    >
      <Sidebar.Items className={cn(fullWidth ? "w-10/12" : "fixed h-full")}>
        <ScrollArea
          style={{
            height: !fullWidth
              ? `calc(100vh - ${headerHeight + bannerHeight}px)`
              : "100%",
          }}
        >
          <div
            className={
              "flex flex-col justify-between pt-4 w-[15rem] max-w-[15rem] min-w-[15rem]"
            }
            style={{
              height: !fullWidth
                ? `calc(100vh - ${headerHeight + bannerHeight}px)`
                : "100%",
            }}
          >
            <div>
              <SidebarItemGroup>
                <SidebarItem
                  icon={<PeerIcon />}
                  label="Peers"
                  href={"/peers"}
                />

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
                      collapsible
                    >
                      <SidebarItem
                        label="Policies"
                        href={"/access-control"}
                        isChild
                        exactPathMatch={true}
                      />
                      <SidebarItem
                        label="Posture Checks"
                        isChild
                        href={"/posture-checks"}
                        exactPathMatch={true}
                      />
                    </SidebarItem>

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

                  <SidebarItem
                    icon={<DocsIcon />}
                    href={"https://docs.netbird.io/"}
                    target={"_blank"}
                    label="Documentation"
                  />
                </SidebarItemGroup>
              )}
            </div>
          </div>
        </ScrollArea>
      </Sidebar.Items>
    </Sidebar>
  );
}

export function SidebarItemGroup(props: SidebarItemGroupProps) {
  return (
    <Sidebar.ItemGroup
      className={"dark:border-zinc-700/40 space-y-1.5"}
      {...props}
    >
      {props.children}
    </Sidebar.ItemGroup>
  );
}

"use client";

import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import ControlCenterIcon from "@/assets/icons/ControlCenterIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DocsIcon from "@/assets/icons/DocsIcon";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { DistributorNavigation } from "@/cloud/distributor/DistributorNavigation";
import { MSPNavigationItem } from "@/cloud/msp/MSPNavigationItem";
import SidebarItem from "@/components/SidebarItem";
import { NavigationVersionInfo } from "@/components/VersionInfo";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { headerHeight } from "@/layouts/Header";
import { useAssistantPanel } from "@/modules/assistant/AssistantPanelContext";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { NavigationUsageInfo } from "@/modules/billing/NavigationUsageInfo";
import { NetworkNavigation } from "@/modules/networks/misc/NetworkNavigation";
import { SmallBadge } from "@components/ui/SmallBadge";
import * as React from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";

type Props = {
  fullWidth?: boolean;
  hideOnMobile?: boolean;
};

export default function Navigation({
  fullWidth = false,
  hideOnMobile = false,
}: Readonly<Props>) {
  const { bannerHeight } = useAnnouncement();
  const { isNavigationCollapsed } = useApplicationContext();
  // Heights here derive from 100vh, so they must account for the dashboard being
  // inset by the assistant panel or the nav overflows the card and is clipped.
  const { inset } = useAssistantPanel();
  const { permission, isRestricted } = usePermissions();
  const { only: agentNetworkOnly, enabled: agentNetworkEnabled } =
    useAgentNetworkMode();

  return (
    <div
      data-navigation
      className={cn(
        "whitespace-nowrap md:border-r dark:border-zinc-700/40 bg-gray-50 dark:bg-nb-gray relative group/navigation transition-all",
        hideOnMobile ? "hidden md:block" : "",
        fullWidth
          ? "w-auto max-w-[22rem]"
          : // Not a scroll container: the `ScrollArea` inside owns scrolling. Left
            // scrollable it would trip over its own child — a y-scrollbar narrows
            // the content box, which makes the 15rem child overflow sideways.
            "w-[15rem] max-w-[15rem] min-w-[15rem] overflow-hidden",
        // Taken out of flow so hover-expanding the rail overlays the page
        // instead of pushing it (`PageContainer` reserves the 64px). Absolute
        // rather than fixed: a fixed rail escapes the dashboard card's
        // `overflow-hidden`, so it painted over the card's rounded edge once the
        // assistant panel inset it. The row it sits in is `relative`, and its
        // static position is that row's top-left, so this is the same geometry.
        isNavigationCollapsed &&
          "md:w-[64px] md:min-w-[64px] md:absolute md:left-0 md:top-0 md:overflow-hidden md:hover:w-[15rem] md:hover:max-w-[15rem] md:hover:min-w-[15rem] md:z-50",
      )}
      style={{
        height: `calc(100vh - ${headerHeight + bannerHeight + inset * 2}px)`,
      }}
    >
      {/*
        In flow, not positioned out of it: the `ScrollArea` below is already
        sized to the viewport, so taking this out of flow only made the rail
        escape the card's clipping (when fixed) or add scrollable overflow to
        the rail itself (when absolute). `relative` keeps it the containing
        block for the submenu popovers.
      */}
      <div className={cn(fullWidth ? "w-10/12" : "relative z-0")}>
        <ScrollArea
          style={{
            height: !fullWidth
              ? `calc(100vh - ${headerHeight + bannerHeight + inset * 2}px)`
              : "100%",
          }}
        >
          <div
            className={cn(
              "flex flex-col pt-3 justify-between w-[15rem] max-w-[15rem] min-w-[15rem] transition-all",
              isNavigationCollapsed &&
                "md:w-[64px] md:min-w-[64px] md:group-hover/navigation:w-[15rem] md:group-hover/navigation:max-w-[15rem] md:group-hover/navigation:min-w-[15rem] md:overflow-x-clip",
            )}
            style={{
              height: !fullWidth
                ? `calc(100vh - ${headerHeight + bannerHeight + inset * 2}px)`
                : "100%",
            }}
          >
            <div>
              <SidebarItemGroup>
                <SidebarItem
                  icon={<ControlCenterIcon size={16} />}
                  label="Control Center"
                  href={"/control-center"}
                  visible={permission.policies.read}
                />

                <SidebarItem
                  icon={<PeerIcon />}
                  label="Peers"
                  href={"/peers"}
                  visible={!isRestricted}
                />

                <DistributorNavigation />
                <SidebarItem
                  icon={<AccessControlIcon />}
                  label="Access Control"
                  href={"/access-control"}
                  collapsible
                  visible={permission.policies.read}
                >
                  <SidebarItem
                    label="Policies"
                    href={"/access-control"}
                    isChild
                    exactPathMatch={true}
                    visible={permission.policies.read}
                  />
                  <SidebarItem
                    label="Groups"
                    isChild
                    href={"/groups"}
                    visible={permission.policies.read}
                  />
                  <SidebarItem
                    label="Posture Checks"
                    isChild
                    href={"/posture-checks"}
                    exactPathMatch={true}
                    visible={permission.policies.read}
                  />
                </SidebarItem>

                {!agentNetworkOnly && <NetworkNavigation />}

                <SidebarItem
                  icon={<ReverseProxyIcon size={16} />}
                  labelClassName={"pr-0"}
                  label={
                    <div className={"flex items-center gap-2"}>
                      Reverse Proxy
                      <SmallBadge
                        text={"Beta"}
                        variant={"sky"}
                        className={"text-[8px] leading-none py-[3px] px-[5px]"}
                        textClassName={"top-0"}
                      />
                    </div>
                  }
                  href={"/reverse-proxy"}
                  collapsible
                  exactPathMatch={false}
                  visible={permission?.services?.read && !agentNetworkOnly}
                >
                  <SidebarItem
                    label="Services"
                    isChild
                    href={"/reverse-proxy/services"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label="Custom Domains"
                    isChild
                    href={"/reverse-proxy/custom-domains"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label="Clusters"
                    isChild
                    href={"/reverse-proxy/clusters"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label="Access Logs"
                    isChild
                    href={"/reverse-proxy/logs"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                </SidebarItem>

                <SidebarItem
                  icon={<AgentNetworkIcon size={16} />}
                  labelClassName={"pr-0"}
                  label={
                    <div className={"flex items-center gap-2"}>
                      Agent Network
                      {!agentNetworkOnly && (
                        <SmallBadge
                          text={"Beta"}
                          variant={"sky"}
                          className={
                            "text-[8px] leading-none py-[3px] px-[5px]"
                          }
                          textClassName={"top-0"}
                        />
                      )}
                    </div>
                  }
                  href={"/agent-network/providers"}
                  collapsible
                  exactPathMatch={false}
                  // Parent is visible when at least one child is permitted. All
                  // Agent Network pages guard on services.read, so the section
                  // tracks that (plus the feature gating).
                  visible={agentNetworkEnabled && permission?.services?.read}
                >
                  <SidebarItem
                    label="Providers"
                    isChild
                    href={"/agent-network/providers"}
                    exactPathMatch={true}
                    visible={agentNetworkEnabled && permission?.services?.read}
                  />
                  <SidebarItem
                    label="Policies"
                    isChild
                    href={"/agent-network/policies"}
                    exactPathMatch={true}
                    visible={agentNetworkEnabled && permission?.services?.read}
                  />
                  <SidebarItem
                    label="Usage & Logs"
                    isChild
                    href={"/agent-network/usage"}
                    exactPathMatch={true}
                    visible={agentNetworkEnabled && permission?.services?.read}
                  />
                  <SidebarItem
                    label="Configuration"
                    isChild
                    href={"/agent-network/configuration"}
                    exactPathMatch={true}
                    visible={agentNetworkEnabled && permission?.services?.read}
                  />
                </SidebarItem>

                <SidebarItem
                  icon={<DNSIcon />}
                  label="DNS"
                  href={"/dns"}
                  collapsible
                  exactPathMatch={true}
                  visible={
                    (permission.dns.read || permission.nameservers.read) &&
                    !agentNetworkOnly
                  }
                >
                  <SidebarItem
                    label="Nameservers"
                    isChild
                    href={"/dns/nameservers"}
                    visible={permission.nameservers.read}
                  />
                  <SidebarItem
                    label="Zones"
                    isChild
                    href={"/dns/zones"}
                    visible={permission?.dns?.read}
                  />
                  <SidebarItem
                    label="DNS Settings"
                    isChild
                    href={"/dns/settings"}
                    visible={permission.dns.read}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<TeamIcon />}
                  label="Team"
                  href={"/team"}
                  collapsible
                  visible={permission.users.read}
                >
                  <SidebarItem
                    label="Users"
                    isChild
                    href={"/team/users"}
                    visible={permission.users.read}
                  />
                  <SidebarItem
                    label="Service Users"
                    isChild
                    href={"/team/service-users"}
                    visible={permission.users.read}
                  />
                </SidebarItem>
                <ActivityNavigationItem />
              </SidebarItemGroup>

              <SidebarItemGroup>
                <SidebarItem
                  icon={<SettingsIcon />}
                  label="Settings"
                  href={"/settings"}
                  exactPathMatch={true}
                  visible={permission.settings.read}
                />
                <MSPNavigationItem />
                <SidebarItem
                  icon={<IntegrationIcon />}
                  label="Integrations"
                  href={"/integrations"}
                  exactPathMatch={true}
                  visible={
                    permission?.edr?.read ||
                    permission?.idp?.read ||
                    permission?.event_streaming?.read ||
                    (!isNetBirdCloud() && (permission?.settings?.read ?? false))
                  }
                />
                <SidebarItem
                  icon={<DocsIcon />}
                  href={"https://docs.netbird.io/"}
                  target={"_blank"}
                  label="Documentation"
                  visible={true}
                />
              </SidebarItemGroup>
            </div>
            <NavigationUsageInfo />
            <NavigationVersionInfo />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

type SidebarItemGroupProps = {
  children: React.ReactNode;
};

export function SidebarItemGroup({ children }: SidebarItemGroupProps) {
  return (
    <div
      className={
        "mt-4 border-t border-gray-200 pt-4 first:mt-0 first:border-t-0 first:pt-0 dark:border-zinc-700/40 space-y-[3px]"
      }
    >
      {children}
    </div>
  );
}

const ActivityNavigationItem = () => {
  const { permission } = usePermissions();
  const { only: agentNetworkOnly } = useAgentNetworkMode();

  return (
    <SidebarItem
      icon={<ActivityIcon />}
      label="Activity"
      href={"/events"}
      collapsible
      visible={permission.events.read && !agentNetworkOnly}
    >
      <SidebarItem
        label="Audit Events"
        href={"/events/audit"}
        isChild
        exactPathMatch={true}
        visible={permission.events.read}
      />
      <SidebarItem
        label="Traffic Events"
        isChild
        href={"/events/traffic"}
        exactPathMatch={true}
        visible={permission.events.read}
      />
    </SidebarItem>
  );
};

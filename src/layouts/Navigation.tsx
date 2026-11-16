"use client";

import { ScrollArea } from "@components/ScrollArea";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import * as React from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import ControlCenterIcon from "@/assets/icons/ControlCenterIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import GroupsIcon from "@/assets/icons/GroupsIcon";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import SlidersIcon from "@/assets/icons/SlidersIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import TrafficEventsIcon from "@/assets/icons/TrafficEventsIcon";
import UsageLogsIcon from "@/assets/icons/UsageLogsIcon";
import { DistributorNavigation } from "@/cloud/distributor/DistributorNavigation";
import { MSPNavigationItem } from "@/cloud/msp/MSPNavigationItem";
import SidebarItem from "@/components/SidebarItem";
import SidebarItemGroup from "@/components/SidebarItemGroup";
import { NavigationVersionInfo } from "@/components/VersionInfo";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { headerHeight } from "@/layouts/Header";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";
import { NavigationUsageInfo } from "@/modules/billing/NavigationUsageInfo";
import {
  accountPageAccess,
  agentNetworkPageAccess,
  GROUPS_ACTIVE_ROUTES,
  hasNetworkingAccess,
  type NavSectionId,
  PEERS_ACTIVE_ROUTES,
  USERS_ACTIVE_ROUTES,
  visibleSections,
} from "@/modules/navigation/sections";
import { useNavSections } from "@/modules/navigation/useNavSections";
import { NetworkNavigation } from "@/modules/networks/misc/NetworkNavigation";

type Props = {
  fullWidth?: boolean;
  hideOnMobile?: boolean;
};

/**
 * One sidebar for both products: what both work with (Control Center,
 * Peers, Users, Groups) at the top, a collapsible section per product
 * (Networking, Agent Network), and the account area at the bottom. The
 * section rules live in modules/navigation/sections.ts.
 */
export default function Navigation({
  fullWidth = false,
  hideOnMobile = false,
}: Readonly<Props>) {
  const { bannerHeight } = useAnnouncement();
  const { isNavigationCollapsed } = useApplicationContext();
  const { permission, isRestricted } = usePermissions();
  const { loggedInUser } = useLoggedInUser();
  // "enabled" already falls back to the caller's agent_network grants when
  // the feature flag can't be resolved (no accounts read — usage_viewer and
  // custom delegated roles), so it is the one surface switch here.
  const { only: agentNetworkOnly, enabled: agentNetworkEnabled } =
    useAgentNetworkMode();
  // Heights here derive from 100vh, so they must account for the dashboard being
  // inset by the assistant panel or the nav overflows the card and is clipped.
  const { inset } = useAssistantSidebar();
  // Caller-scoped: true whenever the caller's own policies grant access to
  // at least one provider, independent of any agent_network permission —
  // this is what lets plain users (limited view included) reach Connect Agent
  // and the self-scoped Usage & Logs view.
  const { configured: mySetupConfigured } = useMyAgentNetworkSetup();
  const agentNetworkPages = agentNetworkPageAccess({
    permission,
    configured: mySetupConfigured,
  });
  const accountPages = accountPageAccess({
    permission,
    cloud: isNetBirdCloud(),
  });
  const shown = visibleSections({
    agentNetworkOnly,
    agentNetworkEnabled,
    agentNetworkAccess: Object.values(agentNetworkPages).some(Boolean),
    networkingAccess: hasNetworkingAccess(permission),
    accountAccess: Object.values(accountPages).some(Boolean),
  });
  const sections = useNavSections(loggedInUser?.id);
  const section = (id: NavSectionId) => ({
    id,
    open: sections.isOpen(id),
    onOpenChange: (open: boolean) => sections.setOpen(id, open),
    active: sections.isActive(id),
  });

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
          // Vertical only: the rail's width is fixed, so any horizontal
          // overflow is something to clip, never something to scroll.
          scrollbars={"vertical"}
          style={{
            height: !fullWidth
              ? `calc(100vh - ${headerHeight + bannerHeight + inset * 2}px)`
              : "100%",
          }}
        >
          <div
            className={cn(
              // Clipped in both states, not just while collapsed: this column's
              // width is fixed, but an item's own min-content isn't — a long
              // label with a badge ("Agent Network" + Beta) can exceed 15rem and
              // `whitespace-nowrap` forbids wrapping it. Clipping here keeps
              // that overflow from widening the `ScrollArea`'s content box,
              // which Radix sizes with `display: table` around this column.
              "flex flex-col pt-3 w-[15rem] max-w-[15rem] min-w-[15rem] overflow-x-clip transition-all",
              isNavigationCollapsed &&
                "md:w-[64px] md:min-w-[64px] md:group-hover/navigation:w-[15rem] md:group-hover/navigation:max-w-[15rem] md:group-hover/navigation:min-w-[15rem]",
            )}
            style={{
              minHeight: !fullWidth
                ? `calc(100vh - ${headerHeight + bannerHeight + inset * 2}px)`
                : "100%",
            }}
          >
            {/* What both products work with: Control Center maps the
                connections between devices, networks and AI providers;
                Peers are the machines, devices and agents; Users and Groups
                are who and what every policy, network or agent, is written
                for. */}
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
                activeRoutes={PEERS_ACTIVE_ROUTES}
                // Restricted users get the add-your-device view there, so
                // the link stays even in the limited (user role) sidebar.
                visible={true}
              />
              <SidebarItem
                icon={<TeamIcon />}
                label="Users"
                href={"/team/users"}
                // Service Users is a tab on the Users page, and a user's own
                // page sits at /team/user; Users stays active on both.
                activeRoutes={USERS_ACTIVE_ROUTES}
                visible={permission.users.read}
              />
              <SidebarItem
                icon={<GroupsIcon />}
                label="Groups"
                href={"/groups"}
                activeRoutes={GROUPS_ACTIVE_ROUTES}
                // The Groups page's own check. Both products' policies are
                // written against groups, so Agent Network admins need it as
                // much as network admins; the limited (user role) view keeps
                // to its own pages.
                visible={permission.groups.read && !isRestricted}
              />
              <DistributorNavigation />
            </SidebarItemGroup>

            {shown.includes("networking") && (
              <SidebarItemGroup
                label={"Networking"}
                collapsible
                {...section("networking")}
              >
                <NetworkingItems />
              </SidebarItemGroup>
            )}

            {shown.includes("agent-network") && (
              <SidebarItemGroup
                label={"Agent Network"}
                badge={
                  !agentNetworkOnly && (
                    <SmallBadge
                      text={"Beta"}
                      variant={"sky"}
                      className={"text-[8px] leading-none py-[3px] px-[5px]"}
                      textClassName={"top-0"}
                    />
                  )
                }
                collapsible
                {...section("agent-network")}
              >
                <SidebarItem
                  icon={<AgentNetworkIcon size={16} />}
                  label="Agents"
                  collapsible
                  visible={
                    agentNetworkPages.connect ||
                    agentNetworkPages.providers ||
                    agentNetworkPages.policies
                  }
                >
                  <SidebarItem
                    label="Connect Agent"
                    isChild
                    href={"/agent-network/connect"}
                    exactPathMatch={true}
                    visible={agentNetworkPages.connect}
                  />
                  <SidebarItem
                    label="Providers"
                    isChild
                    href={"/agent-network/providers"}
                    exactPathMatch={true}
                    visible={agentNetworkPages.providers}
                  />
                  <SidebarItem
                    label="Agent Policies"
                    isChild
                    href={"/agent-network/policies"}
                    exactPathMatch={true}
                    visible={agentNetworkPages.policies}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<UsageLogsIcon />}
                  label="Usage & Logs"
                  href={"/agent-network/usage"}
                  exactPathMatch={true}
                  visible={agentNetworkPages.usage}
                />
                <SidebarItem
                  icon={<SlidersIcon />}
                  label="Configuration"
                  href={"/agent-network/configuration"}
                  exactPathMatch={true}
                  visible={agentNetworkPages.configuration}
                />
              </SidebarItemGroup>
            )}

            {/* Pushes the account area to the bottom while there is room. */}
            <div className={"flex-1"} />

            {/* The account area: how the account is set up and what changed
                in it. Both products share it. Documentation lives in the
                header's help menu. */}
            {shown.includes("account") && (
              <SidebarItemGroup label={"Account"} {...section("account")}>
                <SidebarItem
                  icon={<SettingsIcon />}
                  label="Settings"
                  href={"/settings"}
                  exactPathMatch={true}
                  visible={accountPages.settings}
                />
                <MSPNavigationItem />
                <SidebarItem
                  icon={<IntegrationIcon />}
                  label="Integrations"
                  href={"/integrations"}
                  exactPathMatch={true}
                  visible={accountPages.integrations}
                />
                <SidebarItem
                  icon={<ActivityIcon />}
                  label="Audit Events"
                  href={"/events/audit"}
                  exactPathMatch={true}
                  visible={accountPages.auditEvents}
                />
              </SidebarItemGroup>
            )}
            <NavigationUsageInfo />
            <NavigationVersionInfo />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

const NetworkingItems = () => {
  const { permission } = usePermissions();
  return (
    <>
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
          label="Posture Checks"
          isChild
          href={"/posture-checks"}
          exactPathMatch={true}
          visible={permission.policies.read}
        />
      </SidebarItem>

      <NetworkNavigation />

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
        visible={permission?.services?.read}
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
        icon={<DNSIcon />}
        label="DNS"
        href={"/dns"}
        collapsible
        exactPathMatch={true}
        visible={permission.dns.read || permission.nameservers.read}
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
        icon={<TrafficEventsIcon />}
        label="Traffic Events"
        href={"/events/traffic"}
        exactPathMatch={true}
        visible={permission.events.read}
      />
    </>
  );
};

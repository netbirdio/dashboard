"use client";

import { ScrollArea } from "@components/ScrollArea";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { isAgentNetworkInsightsPreview, isNetBirdCloud } from "@utils/netbird";
import {
  ChartColumnIcon,
  GaugeIcon,
  LogsIcon,
  type LucideIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import * as React from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import ControlCenterIcon from "@/assets/icons/ControlCenterIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DocsIcon from "@/assets/icons/DocsIcon";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
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
import { agentNetworkNavAccess } from "@/modules/agent-network/agentNetworkNavigation";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";
import { useProduct } from "@/modules/agent-network/useProduct";
import { NavigationUsageInfo } from "@/modules/billing/NavigationUsageInfo";
import { NetworkNavigation } from "@/modules/networks/misc/NetworkNavigation";

type Props = {
  fullWidth?: boolean;
  hideOnMobile?: boolean;
};

/**
 * The sidebar: the current product's pages, then the account area, the
 * same in both products, right below them. The header's product switch
 * decides which product's pages show (see modules/agent-network/product.ts).
 */
export default function Navigation({
  fullWidth = false,
  hideOnMobile = false,
}: Readonly<Props>) {
  const { bannerHeight } = useAnnouncement();
  const { isNavigationCollapsed } = useApplicationContext();
  const { product } = useProduct();

  return (
    <div
      data-navigation
      className={cn(
        "whitespace-nowrap md:border-r dark:border-zinc-700/40 bg-gray-50 dark:bg-nb-gray relative group/navigation transition-all",
        hideOnMobile ? "hidden md:block" : "",
        fullWidth
          ? "w-auto max-w-[22rem]"
          : "w-[15rem] max-w-[15rem] min-w-[15rem] overflow-y-auto",
        isNavigationCollapsed &&
          "md:w-[64px] md:min-w-[64px] md:fixed md:overflow-hidden md:hover:w-[15rem] md:hover:max-w-[15rem] md:hover:min-w-[15rem] md:z-50",
      )}
      style={{
        // In the mobile drawer the sidebar sits below the drawer's own rows,
        // so it takes the height the drawer leaves it instead.
        height: fullWidth
          ? "100%"
          : `calc(100vh - ${headerHeight + bannerHeight}px)`,
      }}
    >
      <div className={cn(fullWidth ? "w-10/12 h-full" : "fixed z-0")}>
        <ScrollArea
          style={{
            height: !fullWidth
              ? `calc(100vh - ${headerHeight + bannerHeight}px)`
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
                ? `calc(100vh - ${headerHeight + bannerHeight}px)`
                : "100%",
            }}
          >
            <SidebarItemGroup data-product-navigation={product}>
              {product === "agent-network" ? (
                <AgentNetworkNavigation />
              ) : (
                <NetworkingNavigation />
              )}
            </SidebarItemGroup>
            <AccountNavigation />
            {/* Pushes the usage and version cards to the bottom. */}
            <div className={"grow"} aria-hidden />
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
  /** A heading over the group; hidden while the sidebar is collapsed. */
  label?: string;
  "data-product-navigation"?: string;
  "data-account-navigation"?: boolean;
};

export function SidebarItemGroup({
  children,
  label,
  ...data
}: SidebarItemGroupProps) {
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();
  return (
    <div
      {...data}
      className={
        "mt-4 border-t border-gray-200 pt-4 first:mt-0 first:border-t-0 first:pt-0 dark:border-zinc-700/40 space-y-[3px]"
      }
    >
      {label && (
        <div
          className={cn(
            "px-6 pb-1.5 text-[.7rem] font-medium uppercase tracking-wider text-gray-500 dark:text-nb-gray-500 transition-opacity",
            isNavigationCollapsed &&
              !mobileNavOpen &&
              "md:opacity-0 md:group-hover/navigation:opacity-100",
          )}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * A lucide icon at the size of the sidebar's own icons. Like them it must
 * not shrink, or the collapsed sidebar squeezes it out next to its label.
 */
const NavIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <Icon size={16} className={"shrink-0"} />
);

/** The small Beta / Preview badge next to a sidebar label. */
const SidebarBadge = ({
  text,
  variant,
}: {
  text: string;
  variant: "sky" | "yellow";
}) => (
  <SmallBadge text={text} variant={variant} size={"xs"} />
);

/**
 * Control Center and Peers are in both products, with one URL each: the
 * link names the product it is opened in, so the page shows the same one.
 */
const SharedProductItems = () => {
  const { permission } = usePermissions();
  const { link } = useProduct();
  return (
    <>
      <SidebarItem
        icon={<ControlCenterIcon size={16} />}
        label="Control Center"
        href={link("/control-center")}
        visible={permission.policies.read}
      />
      <SidebarItem
        icon={<PeerIcon />}
        label="Peers"
        href={link("/peers")}
        // Restricted users get the add-your-device view there, so the link
        // stays even in the limited (user role) sidebar.
        visible={true}
      />
      <DistributorNavigation />
    </>
  );
};

const NetworkingNavigation = () => {
  const { permission } = usePermissions();

  return (
    <>
      <SharedProductItems />
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
            <SidebarBadge text={"Beta"} variant={"sky"} />
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

      {/* Audit Events, which cover the whole account, are in the account
          area. */}
      <SidebarItem
        icon={<ActivityIcon />}
        label="Traffic Events"
        href={"/events/traffic"}
        visible={permission.events.read}
      />
    </>
  );
};

const AgentNetworkNavigation = () => {
  const { permission } = usePermissions();
  // "enabled" already falls back to the caller's agent_network grants when
  // the feature flag can't be resolved (no accounts read: usage_viewer and
  // custom delegated roles), so it is the one surface switch here.
  const { enabled: surface } = useAgentNetworkMode();
  const { configured } = useMyAgentNetworkSetup();
  const access = agentNetworkNavAccess({
    permission,
    surface,
    configured,
    insightsPreview: isAgentNetworkInsightsPreview(),
  });

  return (
    <>
      <SharedProductItems />

      {/* Placeholders behind the Insights preview flag until the
          analytics exist. */}
      <SidebarItem
        icon={<NavIcon icon={ChartColumnIcon} />}
        labelClassName={"pr-0"}
        label={
          <div className={"flex items-center gap-2"}>
            Insights
            <SidebarBadge text={"Preview"} variant={"yellow"} />
          </div>
        }
        href={"/agent-network/insights"}
        collapsible
        visible={access.insights}
      >
        <SidebarItem
          label="Overview"
          isChild
          href={"/agent-network/insights"}
          exactPathMatch={true}
          visible={access.insights}
        />
        <SidebarItem
          label="Models"
          isChild
          href={"/agent-network/insights/models"}
          exactPathMatch={true}
          visible={access.insights}
        />
        <SidebarItem
          label="Tasks"
          isChild
          href={"/agent-network/insights/tasks"}
          exactPathMatch={true}
          visible={access.insights}
        />
        <SidebarItem
          label="Departments"
          isChild
          href={"/agent-network/insights/departments"}
          exactPathMatch={true}
          visible={access.insights}
        />
      </SidebarItem>

      <SidebarItem
        icon={<NavIcon icon={GaugeIcon} />}
        label="Usage & Logs"
        href={"/agent-network/usage"}
        exactPathMatch={true}
        visible={access.usage}
      />

      <SidebarItem
        icon={<AgentNetworkIcon size={16} />}
        label="Agents"
        collapsible
        visible={access.agents}
      >
        <SidebarItem
          label="Connect Agent"
          isChild
          href={"/agent-network/connect"}
          exactPathMatch={true}
          visible={access.connect}
        />
        <SidebarItem
          label="Providers"
          isChild
          href={"/agent-network/providers"}
          exactPathMatch={true}
          visible={access.providers}
        />
        <SidebarItem
          label="Agent Policies"
          isChild
          href={"/agent-network/policies"}
          exactPathMatch={true}
          visible={access.policies}
        />
      </SidebarItem>

      <SidebarItem
        icon={<NavIcon icon={SlidersHorizontalIcon} />}
        label="Configuration"
        href={"/agent-network/configuration"}
        exactPathMatch={true}
        visible={access.configuration}
      />
    </>
  );
};

/**
 * Identity, audit, settings and integrations, the same in both products.
 * Links keep the product the caller is in, so Team opened from Agent
 * Network stays in Agent Network.
 */
const AccountNavigation = () => {
  const { permission } = usePermissions();
  const { link } = useProduct();

  return (
    <SidebarItemGroup label={"Account"} data-account-navigation>
      <SidebarItem
        icon={<TeamIcon />}
        label="Team"
        href={"/team"}
        collapsible
        visible={permission.users.read || permission.groups.read}
      >
        <SidebarItem
          label="Users"
          isChild
          href={link("/team/users")}
          visible={permission.users.read}
        />
        <SidebarItem
          label="Service Users"
          isChild
          href={link("/team/service-users")}
          visible={permission.users.read}
        />
        {/* Both products' policies are written against groups of users
            and peers, so groups sit with the people, not in one
            product's access control. */}
        <SidebarItem
          label="Groups"
          isChild
          href={link("/groups")}
          visible={permission.groups.read}
        />
      </SidebarItem>
      <SidebarItem
        icon={<NavIcon icon={LogsIcon} />}
        label="Audit Events"
        href={link("/events/audit")}
        exactPathMatch={true}
        visible={permission.events.read}
      />
      <SidebarItem
        icon={<SettingsIcon />}
        label="Settings"
        href={link("/settings")}
        exactPathMatch={true}
        visible={permission.settings.read}
      />
      <MSPNavigationItem />
      <SidebarItem
        icon={<IntegrationIcon />}
        label="Integrations"
        href={link("/integrations")}
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
  );
};

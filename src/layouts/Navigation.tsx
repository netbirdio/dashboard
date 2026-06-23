"use client";

import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
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
import { NavigationUsageInfo } from "@/modules/billing/NavigationUsageInfo";
import { NetworkNavigation } from "@/modules/networks/misc/NetworkNavigation";
import { SmallBadge } from "@components/ui/SmallBadge";
import * as React from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { useTranslations } from 'next-intl';

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
  const { permission, isRestricted } = usePermissions();
  const t = useTranslations('navigation');

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
          "md:w-[70px] md:min-w-[70px] md:fixed md:overflow-hidden md:hover:w-[15rem] md:hover:max-w-[15rem] md:hover:min-w-[15rem] md:z-50",
      )}
      style={{
        height: `calc(100vh - ${headerHeight + bannerHeight}px)`,
      }}
    >
      <div className={cn(fullWidth ? "w-10/12" : "fixed z-0")}>
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
                "md:w-[70px] md:min-w-[70px] md:group-hover/navigation:w-[15rem] md:group-hover/navigation:max-w-[15rem] md:group-hover/navigation:min-w-[15rem] md:overflow-x-clip",
            )}
            style={{
              height: !fullWidth
                ? `calc(100vh - ${headerHeight + bannerHeight}px)`
                : "100%",
            }}
          >
            <div>
              <SidebarItemGroup>
                <SidebarItem
                  icon={<ControlCenterIcon size={16} />}
                  label={t('controlCenter')}
                  href={"/control-center"}
                  visible={permission.policies.read}
                />

                <SidebarItem
                  icon={<PeerIcon />}
                  label={t('peers')}
                  href={"/peers"}
                  collapsible
                  visible={!isRestricted}
                >
                  <SidebarItem
                    label={t('userDevices')}
                    isChild
                    href={"/peers/users"}
                    exactPathMatch={true}
                    visible={!isRestricted}
                  />
                  <SidebarItem
                    label={t('servers')}
                    isChild
                    href={"/peers/servers"}
                    exactPathMatch={true}
                    visible={!isRestricted}
                  />
                </SidebarItem>

                <DistributorNavigation />
                <SidebarItem
                  icon={<AccessControlIcon />}
label={t('accessControl')}
                  href={"/access-control"}
                  collapsible
                  visible={permission.policies.read}
                >
                  <SidebarItem
                    label={t('policies')}
                    href={"/access-control"}
                    isChild
                    exactPathMatch={true}
                    visible={permission.policies.read}
                  />
                  <SidebarItem
                    label={t('groups')}
                    isChild
                    href={"/groups"}
                    visible={permission.policies.read}
                  />
                  <SidebarItem
                    label={t('postureChecks')}
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
                      {t('reverseProxy')}
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
                    label={t('services')}
                    isChild
                    href={"/reverse-proxy/services"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label={t('customDomains')}
                    isChild
                    href={"/reverse-proxy/custom-domains"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label={t('clusters')}
                    isChild
                    href={"/reverse-proxy/clusters"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                  <SidebarItem
                    label={t('accessLogs')}
                    isChild
                    href={"/reverse-proxy/logs"}
                    exactPathMatch={true}
                    visible={permission?.services?.read}
                  />
                </SidebarItem>

                <SidebarItem
                  icon={<DNSIcon />}
label={t('dns')}
                  href={"/dns"}
                  collapsible
                  exactPathMatch={true}
                  visible={permission.dns.read || permission.nameservers.read}
                >
                  <SidebarItem
                    label={t('nameservers')}
                    isChild
                    href={"/dns/nameservers"}
                    visible={permission.nameservers.read}
                  />
                  <SidebarItem
                    label={t('zones')}
                    isChild
                    href={"/dns/zones"}
                    visible={permission?.dns?.read}
                  />
                  <SidebarItem
                    label={t('dnsSettings')}
                    isChild
                    href={"/dns/settings"}
                    visible={permission.dns.read}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<TeamIcon />}
label={t('team')}
                  href={"/team"}
                  collapsible
                  visible={permission.users.read}
                >
                  <SidebarItem
                    label={t('users')}
                    isChild
                    href={"/team/users"}
                    visible={permission.users.read}
                  />
                  <SidebarItem
                    label={t('serviceUsers')}
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
                  label={t('settings')}
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
                  label={t('documentation')}
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
  const t = useTranslations('navigation');

  return (
    <SidebarItem
      icon={<ActivityIcon />}
label={t('activity')}
      href={"/events"}
      collapsible
      visible={permission.events.read}
    >
      <SidebarItem
        label={t('auditEvents')}
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

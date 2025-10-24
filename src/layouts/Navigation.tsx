"use client";

import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DocsIcon from "@/assets/icons/DocsIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import SidebarItem from "@/components/SidebarItem";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { headerHeight } from "@/layouts/Header";
import { NetworkNavigation } from "@/modules/networks/misc/NetworkNavigation";

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

  return (
    <div
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
                  icon={<PeerIcon />}
                  label="Peers"
                  href={"/peers"}
                  visible={!isRestricted}
                />

                <SidebarItem
                  icon={<SetupKeysIcon />}
                  label="Setup Keys"
                  href={"/setup-keys"}
                  visible={permission.setup_keys.read}
                />
                <SidebarItem
                  icon={<AccessControlIcon />}
                  label="Access Control"
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
                  icon={<DNSIcon />}
                  label="DNS"
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
                    label="DNS Settings"
                    isChild
                    href={"/dns/settings"}
                    visible={permission.dns.read}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<TeamIcon />}
                  label="Team"
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
                    label="Groups"
                    isChild
                    href={"/team/groups"}
                    visible={permission.users.read}
                  />
                  <SidebarItem
                    label="Service Users"
                    isChild
                    href={"/team/service-users"}
                    visible={permission.users.read}
                  />
                </SidebarItem>
                <SidebarItem
                  icon={<ActivityIcon />}
                  label="Activity"
                  href={"/events/audit"}
                  exactPathMatch={true}
                  visible={permission.events.read}
                />
              </SidebarItemGroup>

              <SidebarItemGroup>
                <SidebarItem
                  icon={<SettingsIcon />}
                  label="Settings"
                  href={"/settings"}
                  exactPathMatch={true}
                  visible={permission.settings.read}
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

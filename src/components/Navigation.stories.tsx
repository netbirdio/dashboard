import Breadcrumbs from "@components/Breadcrumbs";
import SidebarItem from "@components/SidebarItem";
import SidebarItemGroup from "@components/SidebarItemGroup";
import { SmallBadge } from "@components/ui/SmallBadge";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  HomeIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { padded, withAppProviders } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Navigation",
  decorators: [padded],
};
export default meta;

export const BreadcrumbTrail: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Breadcrumbs>
      <Breadcrumbs.Item
        href={"/access-control"}
        label={"Access Control"}
        icon={<HomeIcon size={13} />}
      />
      <Breadcrumbs.Item href={"/access-control"} label={"Policies"} />
      <Breadcrumbs.Item label={"Developers to Servers"} active />
    </Breadcrumbs>
  ),
  play: ({ canvasElement }) => {
    canvasElement.querySelectorAll("a")[1]?.setAttribute("data-capture", "");
  },
};

/* SidebarItem reads collapse state from ApplicationProvider; the pathname
   marks "Peers" as the active item. */
export const Sidebar: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  decorators: [withAppProviders],
  parameters: { nextjs: { navigation: { pathname: "/peers" } } },
  render: () => (
    <ul className={"flex flex-col gap-1 w-[260px]"}>
      <SidebarItem
        visible
        href={"/peers"}
        exactPathMatch
        icon={<MonitorSmartphoneIcon size={16} />}
        label={"Peers"}
      />
      <SidebarItem
        visible
        href={"/team/users"}
        icon={<Users size={16} />}
        label={"Users"}
      />
      <SidebarItem
        visible
        collapsible
        icon={<ShieldCheck size={16} />}
        label={"Access Control"}
      >
        <SidebarItem
          visible
          isChild
          href={"/access-control"}
          label={"Policies"}
        />
        <SidebarItem
          visible
          isChild
          href={"/posture-checks"}
          label={"Posture Checks"}
        />
      </SidebarItem>
      <SidebarItem
        visible
        href={"/networks"}
        icon={<NetworkIcon size={16} />}
        label={"Networks"}
      />
      <SidebarItem
        visible
        href={"/settings"}
        icon={<Settings size={16} />}
        label={"Settings"}
      />
    </ul>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelectorAll("a, button")[1]
      ?.setAttribute("data-capture", "");
  },
};

/* Sidebar groups: a plain group set apart by a divider, and groups with a
   heading. A collapsible heading opens and closes its items; the group of
   the current page ("/agent-network/usage") is highlighted. */
export const SidebarGroups: StoryObj = {
  tags: ["capture-hover"],
  decorators: [withAppProviders],
  parameters: { nextjs: { navigation: { pathname: "/agent-network/usage" } } },
  render: () => (
    <div className={"w-[240px]"}>
      <SidebarItemGroup>
        <SidebarItem
          visible
          href={"/peers"}
          icon={<MonitorSmartphoneIcon size={16} />}
          label={"Peers"}
        />
      </SidebarItemGroup>
      <SidebarItemGroup label={"Networking"} collapsible open={false}>
        <SidebarItem
          visible
          href={"/networks"}
          icon={<NetworkIcon size={16} />}
          label={"Networks"}
        />
      </SidebarItemGroup>
      <SidebarItemGroup
        label={"Agent Network"}
        badge={
          <SmallBadge
            text={"Beta"}
            variant={"sky"}
            className={"text-[8px] leading-none py-[3px] px-[5px]"}
            textClassName={"top-0"}
          />
        }
        collapsible
        open
        active
      >
        <SidebarItem
          visible
          href={"/agent-network/usage"}
          exactPathMatch
          icon={<ScrollText size={16} />}
          label={"Usage & Logs"}
        />
        <SidebarItem
          visible
          href={"/agent-network/providers"}
          icon={<Sparkles size={16} />}
          label={"Providers"}
        />
      </SidebarItemGroup>
      <SidebarItemGroup label={"Account"}>
        <SidebarItem
          visible
          href={"/settings"}
          icon={<Settings size={16} />}
          label={"Settings"}
        />
      </SidebarItemGroup>
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=left-navigation-section]")
      ?.setAttribute("data-capture", "");
  },
};

/* An entry that stands for related pages too (activeRoutes): on Service
   Users, a tab of the Users page, the Users entry is active. */
export const SidebarRelatedPages: StoryObj = {
  decorators: [withAppProviders],
  parameters: { nextjs: { navigation: { pathname: "/team/service-users" } } },
  render: () => (
    <ul className={"flex flex-col gap-1 w-[260px]"}>
      <SidebarItem
        visible
        href={"/peers"}
        icon={<MonitorSmartphoneIcon size={16} />}
        label={"Peers"}
      />
      <SidebarItem
        visible
        href={"/team/users"}
        activeRoutes={["/team/service-users", "/team/user"]}
        icon={<Users size={16} />}
        label={"Users"}
      />
    </ul>
  ),
};

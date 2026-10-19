import Breadcrumbs from "@components/Breadcrumbs";
import SidebarItem from "@components/SidebarItem";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  HomeIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  Settings,
  ShieldCheck,
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

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentType } from "react";
import { expect, screen, waitFor, within } from "storybook/test";
import NameserversPage from "@/app/(dashboard)/dns/nameservers/page";
import PeersPage from "@/app/(dashboard)/peers/page";
import { formatRelativeDate } from "@/i18n/date-time";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { click, clickRole, inLayout, nav, text } from "@/storybook/core";
import { peers } from "@/storybook/fixtures";

function localizedPage(Page: ComponentType) {
  const Dashboard = inLayout(Page);
  return function DashboardWithLocale() {
    return (
      <LocaleProvider>
        <Dashboard />
      </LocaleProvider>
    );
  };
}

const meta: Meta = {
  title: "Pages/Core/Localized Tables",
  parameters: nav("/peers"),
  render: localizedPage(PeersPage),
};
export default meta;

async function switchToChinese() {
  await clickRole("button", "Interface language");
  await clickRole("menuitemradio", "简体中文");
}

export const PeersInSimplifiedChinese: StoryObj<typeof meta> = {
  parameters: nav("/peers"),
  render: localizedPage(PeersPage),
  play: async () => {
    await text("olivias-macbook-pro");
    await switchToChinese();
    await expect(
      await screen.findByText(/查看已接入网络的用户设备/),
    ).toBeVisible();
    await expect(
      await screen.findByRole("button", { name: /未通过合规检查/ }),
    ).toBeVisible();
    await expect(
      await screen.findByRole("button", { name: /已绕过检查/ }),
    ).toBeVisible();
    await expect(
      await screen.findByPlaceholderText("按名称、IP、MAC、所有者或分组搜索…"),
    ).toBeVisible();
    await expect(
      await screen.findByRole("columnheader", { name: "最近在线" }),
    ).toBeVisible();
    const offline = peers.find((peer) => !peer.connected && peer.last_seen)!;
    const relativeDate = formatRelativeDate(
      new Date(offline.last_seen),
      "zh-Hans",
    );
    const offlineRow = await screen.findByRole("row", {
      name: new RegExp(offline.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    });
    await expect(within(offlineRow).getByText(relativeDate)).toBeVisible();
    await click(screen.findByTestId("table-filters-button"));
    await waitFor(async () => {
      await expect(
        screen.getByRole("button", { name: "操作系统" }),
      ).toBeVisible();
    });
  },
};

export const SwitchLanguageWithActiveFilter: StoryObj<typeof meta> = {
  parameters: nav("/dns/nameservers"),
  render: localizedPage(NameserversPage),
  play: async () => {
    await click(screen.findByTestId("table-filters-button"));
    await click(screen.findByTestId("table-filter-enabled"));
    await click(screen.findByTestId("radio-option-active"));
    await expect(
      await screen.findByRole("button", { name: "Status: Active" }),
    ).toBeVisible();

    await switchToChinese();
    await expect(
      await screen.findByRole("button", { name: /状态：.*已启用/ }),
    ).toBeVisible();
    await expect(
      await screen.findByRole("button", { name: "移除「状态」筛选条件" }),
    ).toBeVisible();
    await expect(
      await screen.findByRole("columnheader", { name: "匹配域名" }),
    ).toBeVisible();
  },
};

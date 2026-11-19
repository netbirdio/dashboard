import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen } from "storybook/test";
import GroupsPage from "@/app/(dashboard)/groups/page";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { clickRole, inLayout, nav } from "@/storybook/core";

const GroupsDashboard = inLayout(GroupsPage);
const meta: Meta = {
  title: "Pages/Core/Localized Dashboard",
  parameters: nav("/groups"),
  render: () => (
    <LocaleProvider>
      <GroupsDashboard />
    </LocaleProvider>
  ),
};
export default meta;

async function switchToChinese() {
  await clickRole("button", "Interface language");
  await clickRole("menuitemradio", "简体中文");
}

export const SimplifiedChinese: StoryObj<typeof meta> = {
  play: async () => {
    await switchToChinese();
    await expect(
      await screen.findByRole("heading", { name: /分组/ }),
    ).toBeVisible();
    await expect(
      await screen.findByPlaceholderText("按分组名称搜索…"),
    ).toBeVisible();
    await expect(
      await screen.findByRole("columnheader", { name: "名称" }),
    ).toBeVisible();
  },
};

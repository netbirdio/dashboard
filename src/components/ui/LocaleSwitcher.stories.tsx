import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { LocaleProvider, useTranslations } from "@/i18n/LocaleProvider";
import LocaleSwitcher from "./LocaleSwitcher";

function Preview() {
  const t = useTranslations();
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <h1>{t("common.peers")}</h1>
      <LocaleSwitcher />
    </div>
  );
}

const meta: Meta<typeof LocaleSwitcher> = {
  title: "Components/Locale Switcher",
  component: LocaleSwitcher,
  render: () => (
    <LocaleProvider>
      <Preview />
    </LocaleProvider>
  ),
};
export default meta;

type Story = StoryObj<typeof meta>;

export const LanguageMenu: Story = {
  play: async () => {
    await userEvent.click(
      screen.getByRole("button", { name: "Interface language" }),
    );
    await expect(
      screen.getByRole("menuitemradio", { name: "English" }),
    ).toHaveAttribute("aria-checked", "true");
    await waitFor(async () => {
      await expect(
        screen.getByRole("menuitemradio", { name: "简体中文" }),
      ).toBeVisible();
    });
  },
};

export const SimplifiedChinese: Story = {
  play: async () => {
    await userEvent.click(
      screen.getByRole("button", { name: "Interface language" }),
    );
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "简体中文" }),
    );
    await expect(screen.getByRole("heading", { name: "节点" })).toBeVisible();
    await expect(
      screen.getByRole("button", { name: "界面语言" }),
    ).toBeVisible();
  },
};

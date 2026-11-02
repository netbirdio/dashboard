import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ConfigurationPage from "@/app/(dashboard)/agent-network/configuration/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  dialog,
  findText,
  settle,
  waitForSelector,
} from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Agent Network/Configuration",
  parameters: {
    nextjs: { navigation: { pathname: "/agent-network/configuration" } },
  },
  render: () => (
    <DashboardLayout>
      <ConfigurationPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const tab = (name: string) => ({
  nextjs: {
    navigation: {
      pathname: "/agent-network/configuration",
      query: { tab: name },
    },
  },
});

const loaded = async () => {
  await findText("Account-wide monthly cap");
  await settle();
};

export const GlobalLimits: Story = {
  tags: ["capture-hover"],
  play: async () => {
    await loaded();
    (await findText("Contractor daily tokens"))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const GlobalLimitsEmpty: Story = {
  parameters: { api: { "GET /agent-network/budget-rules": [] } },
  play: async () => {
    await findText("Set a Global Limit");
    await settle();
  },
};

async function openRowMenu() {
  await loaded();
  const buttons = (await findText("Contractor daily tokens"))
    .closest("tr")
    ?.querySelectorAll("button");
  await click(buttons?.[buttons.length - 1]);
  await waitForSelector("[role=menu]");
}

export const AddGlobalLimit: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Add Global Limit/);
    await dialog();
    await settle();
  },
};

export const AddGlobalLimitLimits: Story = {
  play: async () => {
    await AddGlobalLimit.play!({} as never);
    await clickRole("tab", /Limits/);
    await settle();
  },
};

export const EditGlobalLimit: Story = {
  play: async () => {
    await openRowMenu();
    await click(await findText("Edit Rule"));
    await findText("Update Global Limit");
    await clickRole("tab", /Limits/);
    await settle();
  },
};

export const LogSettings: Story = {
  parameters: tab("log-settings"),
  play: async () => {
    await waitForSelector("[data-testid=enable-log-collection]");
    await settle();
  },
};

export const Clusters: Story = {
  parameters: tab("clusters"),
  play: async () => {
    await findText("edge.acme-corp.net");
    await settle();
  },
};

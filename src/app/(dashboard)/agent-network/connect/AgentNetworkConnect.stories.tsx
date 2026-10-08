import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ConnectPage from "@/app/(dashboard)/agent-network/connect/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { clickRole, findText, popover, settle } from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Agent Network/Connect",
  parameters: {
    nextjs: { navigation: { pathname: "/agent-network/connect" } },
  },
  render: () => (
    <DashboardLayout>
      <ConnectPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const loaded = async () => {
  await findText(/acme\.ai\.eu\.proxy\.netbird\.io/);
  await settle();
};

export const ClaudeCode: Story = { play: loaded };

export const ClaudeCodeProviderOpen: Story = {
  play: async () => {
    await loaded();
    await clickRole("button", /Anthropic API/);
    await popover();
    await settle();
  },
};

const tabStory = (name: RegExp): Story => ({
  play: async () => {
    await loaded();
    await clickRole("tab", name);
    await settle();
  },
});
export const Codex = tabStory(/Codex/);
export const SDK = tabStory(/SDK/);
export const Curl = tabStory(/curl/i);

export const NotCovered: Story = {
  parameters: {
    api: {
      "GET /agent-network/agent-config": {
        configured: true,
        endpoint: "https://acme.ai.eu.proxy.netbird.io",
        providers: [],
      },
    },
  },
  play: loaded,
};

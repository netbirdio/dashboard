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

export const LogStreaming: Story = {
  parameters: tab("log-streaming"),
  play: async () => {
    await findText("OTLP/gRPC");
    await settle();
  },
};

export const LogStreamingEdit: Story = {
  parameters: tab("log-streaming"),
  play: async () => {
    // The sidebar also has a "Configuration" entry; click the HTTP card's.
    const buttons = (await findText("standardwebhooks.com"))
      .closest(".rounded-lg")
      ?.querySelectorAll("button");
    await click(buttons?.[buttons.length - 1]);
    await findText("HTTP Log Streaming Configuration");
    await settle();
  },
};

export const LogStreamingSetupOtlp: Story = {
  parameters: {
    ...tab("log-streaming"),
    api: { "GET /integrations/agent-network/log-streaming": [] },
  },
  play: async () => {
    await clickRole("button", /Connect OTLP\/gRPC/);
    await dialog();
    await clickRole("tab", /Options/);
    await click(await findText("Advanced"));
    await findText("Max retry interval");
    await settle();
  },
};

// The backend may not be deployed yet; the endpoint then answers 404.
export const LogStreamingNotDeployed: Story = {
  parameters: {
    ...tab("log-streaming"),
    api: {
      "GET /integrations/agent-network/log-streaming": () =>
        new Response(JSON.stringify({ message: "not found", code: 404 }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    },
  },
  play: async () => {
    await findText(/not available on this management server/);
    await settle();
  },
};

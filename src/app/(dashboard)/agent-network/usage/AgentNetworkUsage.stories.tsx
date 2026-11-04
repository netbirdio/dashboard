import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chart } from "chart.js";
import UsagePage from "@/app/(dashboard)/agent-network/usage/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  click,
  clickRole,
  clickTextIn,
  findText,
  openFilters,
  popover,
  settle,
} from "@/storybook/platform";

/* chart.js animates against Date.now(), which the capture script freezes,
   so animated bars would stay at zero height forever. */
Chart.defaults.animation = false;

const meta: Meta = {
  title: "Pages/Platform/Agent Network/Usage",
  parameters: { nextjs: { navigation: { pathname: "/agent-network/usage" } } },
  render: () => (
    <DashboardLayout>
      <UsagePage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;

const logs = {
  nextjs: {
    navigation: {
      pathname: "/agent-network/usage",
      query: { tab: "access-logs" },
    },
  },
};

export const Usage: Story = {
  play: async () => {
    await findText(/Oct 7|10\/07|2026-10-07/);
    await settle(500);
  },
};

export const UsageCost: Story = {
  play: async () => {
    await Usage.play!({} as never);
    await clickRole("button", /^Cost$/);
    await settle(500);
  },
};

export const UsageFilters: Story = {
  play: async () => {
    await Usage.play!({} as never);
    await openFilters();
    await popover();
    await settle();
  },
};

const logsLoaded = async () => {
  await findText(/gpt-4o/);
  await settle();
};

export const AccessLogs: Story = {
  parameters: logs,
  tags: ["capture-hover"],
  play: async () => {
    await logsLoaded();
    (await findText("Dana Developer"))
      .closest("tr")
      ?.setAttribute("data-capture", "");
  },
};

export const AccessLogExpanded: Story = {
  parameters: logs,
  play: async () => {
    await logsLoaded();
    await click(
      (await findText("Dana Developer")).closest("tr")?.querySelector("td"),
    );
    await settle(500);
  },
};

export const AccessLogDeniedExpanded: Story = {
  parameters: logs,
  play: async () => {
    await logsLoaded();
    await click(
      (await findText("Audrey Auditor")).closest("tr")?.querySelector("td"),
    );
    await settle(500);
  },
};

export const AccessLogSessions: Story = {
  parameters: logs,
  play: async () => {
    await logsLoaded();
    await clickRole("button", /Session/);
    await findText(/sess-1|Sessions/);
    await settle(500);
  },
};

export const AccessLogFilters: Story = {
  parameters: logs,
  play: async () => {
    await logsLoaded();
    await openFilters();
    await popover();
    await settle();
  },
};

export const AccessLogProviderFilter: Story = {
  parameters: logs,
  play: async () => {
    await AccessLogFilters.play!({} as never);
    await clickTextIn(popover(), "Provider");
    await settle();
  },
};

export const AccessLogsEmpty: Story = {
  parameters: {
    ...logs,
    api: {
      "GET /agent-network/access-logs": {
        data: [],
        page: 1,
        page_size: 25,
        total_pages: 0,
        total_records: 0,
      },
    },
  },
  play: async () => {
    await settle(1500);
  },
};

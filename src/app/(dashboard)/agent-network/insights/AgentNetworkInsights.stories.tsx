import type { Meta } from "@storybook/nextjs-vite";
import DepartmentsPage from "@/app/(dashboard)/agent-network/insights/departments/page";
import ModelsPage from "@/app/(dashboard)/agent-network/insights/models/page";
import OverviewPage from "@/app/(dashboard)/agent-network/insights/page";
import TasksPage from "@/app/(dashboard)/agent-network/insights/tasks/page";
import { inLayout, nav, type Story, text } from "@/storybook/core";

/* Insights does not exist yet. These placeholder pages show where it sits in
   the Agent Network sidebar and what each page is meant to cover; the routes
   only exist with NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW set, which the
   Storybook config turns on. */
const meta: Meta = {
  title: "Pages/Platform/Agent Network/Insights",
};
export default meta;

const placeholder = () => text(/^Placeholder\./);

export const Overview: Story = {
  parameters: nav("/agent-network/insights"),
  render: inLayout(OverviewPage),
  play: async () => void (await placeholder()),
};

export const Models: Story = {
  parameters: nav("/agent-network/insights/models"),
  render: inLayout(ModelsPage),
  play: async () => void (await placeholder()),
};

export const Tasks: Story = {
  parameters: nav("/agent-network/insights/tasks"),
  render: inLayout(TasksPage),
  play: async () => void (await placeholder()),
};

export const Departments: Story = {
  parameters: nav("/agent-network/insights/departments"),
  render: inLayout(DepartmentsPage),
  play: async () => void (await placeholder()),
};

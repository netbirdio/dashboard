import type { Meta } from "@storybook/nextjs-vite";
import { fireEvent, screen } from "storybook/test";
import DepartmentsPage from "@/app/(dashboard)/agent-network/insights/departments/page";
import ModelsPage from "@/app/(dashboard)/agent-network/insights/models/page";
import OverviewPage from "@/app/(dashboard)/agent-network/insights/page";
import TasksPage from "@/app/(dashboard)/agent-network/insights/tasks/page";
import {
  click,
  inLayout,
  nav,
  type Story,
  text,
  until,
} from "@/storybook/core";

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

/* The sidebar collapsed on an Insights page: the open group's pages show as
   dots, with the current one marked. */
export const CollapsedSidebar: Story = {
  parameters: nav("/agent-network/insights"),
  render: inLayout(OverviewPage),
  play: async () => {
    await placeholder();
    await click(
      document.querySelector<HTMLElement>("[data-navbar-colappse-toggle]")!,
    );
    (document.activeElement as HTMLElement | null)?.blur();
  },
};

/* The mobile drawer on an Insights page, the longest Agent Network sidebar:
   below the user row and the product switch, the list scrolls within the
   height left to it. The menu button only shows below the md breakpoint, so
   it is clicked through the DOM. */
export const MobileDrawer: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  parameters: nav("/agent-network/insights"),
  render: inLayout(OverviewPage),
  play: async () => {
    await placeholder();
    fireEvent.click(await screen.findByTestId("mobile-navigation-toggle"));
    await until(() => {
      if (document.querySelectorAll("[data-navigation]").length < 2)
        throw new Error("mobile drawer not open");
    });
  },
};

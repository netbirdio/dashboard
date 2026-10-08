import type { Meta } from "@storybook/nextjs-vite";
import { screen } from "storybook/test";
import ActivityRedirectPage from "@/app/(dashboard)/(deprecated)/activity/page";
import AuditEventsPage from "@/app/(dashboard)/events/audit/page";
import TrafficEventsPage from "@/app/(dashboard)/events/traffic/page";
import {
  click,
  inLayout,
  nav,
  pauseSvgAnimations,
  resetStorage,
  role,
  type Story,
  text,
} from "@/storybook/core";

const meta: Meta = {
  title: "Pages/Core/Events",
  parameters: nav("/events/audit"),
  beforeEach: resetStorage,
  render: inLayout(AuditEventsPage),
};
export default meta;

const auditLoaded = () => text("Dana Developer");

export const Audit: Story = { play: async () => void (await auditLoaded()) };

export const AuditEmpty: Story = {
  parameters: { api: { "GET /events/audit": [] } },
};

export const AuditFiltersOpen: Story = {
  play: async () => {
    await auditLoaded();
    await click(screen.findByTestId("table-filters-button"));
    await role("dialog");
  },
};

export const AuditDatePickerOpen: Story = {
  play: async () => {
    await auditLoaded();
    await click(document.getElementById("date")!);
    await role("grid");
  },
};

export const AuditCloud: Story = {
  tags: ["cloud"],
  play: async () => void (await auditLoaded()),
};

const trafficLoaded = () => text("olivias-macbook-pro");

export const Traffic: Story = {
  render: inLayout(TrafficEventsPage),
  parameters: nav("/events/traffic"),
  play: async () => void (await trafficLoaded()),
};

export const TrafficCloud: Story = {
  tags: ["cloud"],
  render: inLayout(TrafficEventsPage),
  parameters: nav("/events/traffic"),
  play: async () => void (await trafficLoaded()),
};

export const TrafficExpandedRow: Story = {
  render: inLayout(TrafficEventsPage),
  parameters: nav("/events/traffic"),
  play: async () => {
    await text("dev-thinkpad");
    await click((await text("db-primary")).closest("tr")!);
  },
};

export const TrafficFiltersOpen: Story = {
  render: inLayout(TrafficEventsPage),
  parameters: nav("/events/traffic"),
  play: async () => {
    await trafficLoaded();
    await click(screen.findByTestId("table-filters-button"));
    await role("dialog");
  },
};

export const TrafficEmpty: Story = {
  render: inLayout(TrafficEventsPage),
  parameters: {
    ...nav("/events/traffic"),
    api: {
      "GET /events/network-traffic": {
        data: [],
        page: 1,
        page_size: 10,
        total_pages: 0,
        total_records: 0,
      },
    },
  },
};

/* The old /activity route only shows a spinner while redirecting. */
export const ActivityRedirect: Story = {
  render: inLayout(ActivityRedirectPage),
  parameters: nav("/activity"),
  play: async () => {
    await text("Control Center");
    pauseSvgAnimations();
  },
};

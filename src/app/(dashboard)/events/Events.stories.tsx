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

const edrEvent = (
  id: number,
  timestamp: string,
  activity: string,
  activity_code: string,
  meta: Record<string, unknown>,
) => ({
  id: String(id),
  timestamp,
  activity,
  activity_code,
  initiator_id: "sys",
  initiator_email: "",
  initiator_name: "",
  target_id: `peer-${id}`,
  meta: { type: "endpoint_management", ...meta },
});

const APPROVED = "integrated-validator.host-check.approved";
const DENIED = "integrated-validator.host-check.denied";
const GRACE = "integrated-validator.peer.stale-grace-started";

export const AuditEDR: Story = {
  parameters: {
    api: {
      "GET /events/audit": [
        edrEvent(
          1,
          "2026-11-12T09:40:00Z",
          "Peer kept connected during the EDR grace period",
          GRACE,
          {
            name: "olivias-macbook-pro",
            platform: "intune",
            grace_minutes: 120,
          },
        ),
        edrEvent(
          2,
          "2026-11-12T09:35:00Z",
          "Peer denied by integrated validator",
          DENIED,
          {
            name: "dev-thinkpad",
            platform: "intune",
            reason: "STALE_CHECK_IN",
          },
        ),
        edrEvent(
          3,
          "2026-11-12T09:30:00Z",
          "Peer denied by integrated validator",
          DENIED,
          {
            name: "build-runner-02",
            platform: "falcon",
            reason: "NOT_FOUND_IN_EDR",
          },
        ),
        edrEvent(
          4,
          "2026-11-12T09:25:00Z",
          "Peer denied by integrated validator",
          DENIED,
          {
            name: "qa-mac-mini",
            platform: "fleetdm",
            reason: "DUPLICATE_MATCH",
          },
        ),
        edrEvent(
          5,
          "2026-11-12T09:20:00Z",
          "Peer denied by integrated validator",
          DENIED,
          {
            name: "sales-laptop-07",
            platform: "intune",
            reason: "compliance state is noncompliant",
          },
        ),
        edrEvent(
          6,
          "2026-11-12T09:15:00Z",
          "Peer approved by integrated validator",
          APPROVED,
          { name: "olivias-macbook-pro", platform: "intune" },
        ),
        edrEvent(
          7,
          "2026-10-01T08:00:00Z",
          "Peer denied by integrated validator",
          DENIED,
          { platform: "falcon" },
        ),
      ],
    },
  },
  play: async () => void (await text("qa-mac-mini")),
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

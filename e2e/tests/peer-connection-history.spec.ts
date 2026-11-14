import type { ActivityEvent } from "../../src/interfaces/ActivityEvent";
import { navigateTo } from "../helpers/auth";
import { expect, test } from "../helpers/fixtures";
import type { MockPeer } from "../helpers/mock-peer";

const peer: MockPeer = {
  id: "e2e-mock-connection-history",
  name: "history-peer",
  hostname: "history-peer",
  ip: "100.92.0.250",
  connected: true,
  created_at: "2026-11-12T18:00:00Z",
  last_seen: "2026-11-13T09:42:18Z",
  last_login: "2026-11-13T09:42:18Z",
  os: "Linux",
  version: "0.0.0-e2e",
  groups: [],
  ssh_enabled: false,
  dns_label: "history-peer.netbird.selfhosted",
  login_expired: false,
  login_expiration_enabled: false,
  inactivity_expiration_enabled: false,
  approval_required: false,
  city_name: "",
  country_code: "",
  connection_ip: "203.0.113.24",
  serial_number: "",
  ephemeral: false,
  accessible_peers_count: 0,
};

function connectionEvent(
  id: string,
  code: "peer.connect" | "peer.disconnect",
  timestamp: string,
  sourceIP?: string,
): ActivityEvent {
  return {
    id,
    timestamp,
    activity: code === "peer.connect" ? "Peer connected" : "Peer disconnected",
    activity_code: code,
    initiator_id: "system",
    initiator_email: "",
    initiator_name: "",
    target_id: peer.id,
    meta: {
      name: peer.name,
      ...(sourceIP ? { location_connection_ip: sourceIP } : {}),
    },
  };
}

const peerConnectionEvents = [
  connectionEvent("3", "peer.connect", "2026-11-13T09:42:18Z", "203.0.113.24"),
  connectionEvent("2", "peer.disconnect", "2026-11-13T09:40:03Z"),
  connectionEvent("1", "peer.connect", "2026-11-12T18:15:30Z", "198.51.100.12"),
];

const isHistoryPeer = (url: URL) =>
  url.pathname.endsWith(`/api/peers/${peer.id}`);
const isAuditEvents = (url: URL) => url.pathname.endsWith("/api/events/audit");

test.describe("Peer connection history", () => {
  test.beforeEach(async ({ dashboardAsOwner: page }) => {
    await page.route(isHistoryPeer, (route) => route.fulfill({ json: peer }));
  });

  test.afterEach(async ({ dashboardAsOwner: page }) => {
    await page.unroute(isHistoryPeer);
    await page.unroute(isAuditEvents);
  });

  test("shows historical addresses for this peer and supports searching", async ({
    dashboardAsOwner: page,
  }) => {
    await page.route(isAuditEvents, (route) =>
      route.fulfill({
        json: [
          ...peerConnectionEvents,
          {
            ...peerConnectionEvents[0],
            id: "other",
            target_id: "other-peer",
            meta: { location_connection_ip: "192.0.2.99" },
          },
        ],
      }),
    );
    await navigateTo(page, `/peer?id=${peer.id}`);
    await page.getByTestId("peer-tab-connection-history").click();
    await expect(page.getByText("203.0.113.24", { exact: true })).toBeVisible();
    await expect(
      page.getByText("198.51.100.12", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("192.0.2.99", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("2026-11-13 09:42:18", { exact: true }),
    ).toBeVisible();
    await page.getByTestId("table-search-input").fill("198.51.100.12");
    await expect(
      page.getByText("198.51.100.12", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("203.0.113.24", { exact: true })).toHaveCount(
      0,
    );
  });

  test("explains an empty history", async ({ dashboardAsOwner: page }) => {
    await page.route(isAuditEvents, (route) => route.fulfill({ json: [] }));
    await navigateTo(page, `/peer?id=${peer.id}`);
    await page.getByTestId("peer-tab-connection-history").click();
    await expect(
      page.getByText("No recent connection events", { exact: true }),
    ).toBeVisible();
  });

  test("can retry a failed history request", async ({
    dashboardAsOwner: page,
  }) => {
    let fail = true;
    await page.route(isAuditEvents, (route) =>
      fail
        ? route.fulfill({
            status: 500,
            json: { code: 500, message: "Unavailable" },
          })
        : route.fulfill({ json: peerConnectionEvents }),
    );
    await navigateTo(page, `/peer?id=${peer.id}`);
    await page.getByTestId("peer-tab-connection-history").click();
    await expect(
      page.getByTestId("peer-connection-history-error"),
    ).toContainText("Unable to load connection history.");
    fail = false;
    await page.getByTestId("peer-connection-history-retry").click();
    await expect(page.getByText("203.0.113.24", { exact: true })).toBeVisible();
  });
});

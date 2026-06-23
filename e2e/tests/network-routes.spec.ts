import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix, deleteRoutesByNetworkIdPrefix } from "../helpers/api";

const networkRoutes: string[] = [];
let networkRoutesCreatedGroups: string[] = [];

async function closePopover(
  page: import("@playwright/test").Page,
  selectorCy: string,
) {
  await page.getByTestId(`${selectorCy}-search`).press("Escape");
  await expect(page.getByTestId(`${selectorCy}-search`)).not.toBeVisible();
}

test.describe.serial("Network Routes @network", () => {
  test("Should create a network route with IP range", async ({ dashboardAsOwner: page }) => {
    // Clean up leftovers from previous runs
    await deleteRoutesByNetworkIdPrefix(page, "network-route-");
    await deleteGroupsByPrefix(page, "route-peer-");
    await deleteGroupsByPrefix(page, "route-dist-");
    await deleteGroupsByPrefix(page, "route-acl-");
    await navigateTo(page, "/network-routes");

    const peerGroup = generateRandomName("route-peer-");
    const distGroup = generateRandomName("route-dist-");
    const aclGroup = generateRandomName("route-acl-");
    networkRoutesCreatedGroups.push(peerGroup, distGroup, aclGroup);

    const name = generateRandomName("network-route-");
    await createNetworkRoute(page, {
      name,
      range: "192.168.1.0/24",
      peer_groups: [peerGroup],
      distribution_groups: [distGroup],
      access_control_groups: [aclGroup],
      description: "This is a test route",
    });
    networkRoutes.push(name);
  });

  test("Should create a network route with domains", async ({ dashboardAsOwner: page }) => {
    const peerGroup = generateRandomName("route-peer-");
    const distGroup = generateRandomName("route-dist-");
    const aclGroup = generateRandomName("route-acl-");
    networkRoutesCreatedGroups.push(peerGroup, distGroup, aclGroup);

    const name = generateRandomName("network-route-");
    await createNetworkRoute(page, {
      name,
      domains: ["netbird.io"],
      peer_groups: [peerGroup],
      distribution_groups: [distGroup],
      access_control_groups: [aclGroup],
      description: "This is a test route with domains",
    });
    networkRoutes.push(name);
  });

  test("Should delete network routes", async ({ dashboardAsOwner: page }) => {
    for (const route of networkRoutes) {
      await deleteNetworkRoute(page, route);
    }
  });

  test("Should delete created groups", async ({ dashboardAsOwner: page }) => {
    for (const prefix of networkRoutesCreatedGroups) {
      await deleteGroupsByPrefix(page, prefix);
    }
    networkRoutesCreatedGroups = [];
  });
});

async function createNetworkRoute(
  page: import("@playwright/test").Page,
  opts: {
    range?: string;
    domains?: string[];
    peer_groups?: string[];
    distribution_groups?: string[];
    access_control_groups?: string[];
    name: string;
    description?: string;
    masquerade?: boolean;
    metric?: string;
  },
) {
  await page.getByTestId("open-add-route").click();

  if (opts.range) {
    await page.getByTestId("network-range").fill(opts.range);
  }

  if (opts.domains && opts.domains.length > 0) {
    await page.getByTestId("route-type-domains").click();
    for (const domain of opts.domains) {
      await page.getByTestId("add-domain").click();
      await page.getByTestId("domain-input").last().fill(domain);
    }
  }

  if (opts.peer_groups && opts.peer_groups.length > 0) {
    await page.getByTestId("route-tab-peer-group").click();
    await page.getByTestId("routing-peer-groups-selector").click();
    for (const group of opts.peer_groups) {
      const search = page.getByTestId("routing-peer-groups-selector-search");
      await expect(search).toBeVisible({ timeout: 10_000 });
      await search.fill(group);
      await search.press("Enter");
    }
    await closePopover(page, "routing-peer-groups-selector");
  }

  await page.getByTestId("route-continue").click();

  if (opts.distribution_groups && opts.distribution_groups.length > 0) {
    await page.getByTestId("distribution-groups-selector").click();
    for (const group of opts.distribution_groups) {
      const search = page.getByTestId("distribution-groups-selector-search");
      await expect(search).toBeVisible();
      await search.fill(group);
      await search.press("Enter");
    }
    await closePopover(page, "distribution-groups-selector");
  }

  if (opts.access_control_groups && opts.access_control_groups.length > 0) {
    await page.getByTestId("access-control-groups-selector").click();
    for (const group of opts.access_control_groups) {
      const search = page.getByTestId("access-control-groups-selector-search");
      await expect(search).toBeVisible();
      await search.fill(group);
      await search.press("Enter");
    }
    await closePopover(page, "access-control-groups-selector");
  }

  await page.getByTestId("route-continue").click();

  await page.getByTestId("network-identifier").fill(opts.name);
  if (opts.description) {
    await page.getByTestId("description").fill(opts.description);
  }

  await page.getByTestId("route-continue").click();

  if (opts.masquerade === false) {
    await page.getByText("Masquerade").click();
  }

  if (opts.metric) {
    await page.getByTestId("metric").fill(opts.metric);
  }

  await page.getByTestId("submit-route").click();

  if (opts.access_control_groups && opts.access_control_groups.length > 0) {
    await page.getByTestId("confirmation.cancel").click();
  }

  await expect(page.getByTestId(opts.name)).toBeVisible();
}

async function deleteNetworkRoute(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page
    .locator("tr")
    .filter({ hasText: name })
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByTestId("confirmation.confirm").click();
  await expect(page.getByTestId(name)).not.toBeVisible();
}

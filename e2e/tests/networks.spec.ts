import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix, deleteNetworksByPrefix, deletePoliciesByGroupName, deletePoliciesBySubstring } from "../helpers/api";

let networkName = "";
let resourceName = "";
let policySourceGroup = "";
let routingPeerGroup = "";

test.describe.serial("Networks @network", () => {
  test("Should create a network with a resource, policy, and routing peer", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/networks");

    const name = generateRandomName("test-network-");
    networkName = name;
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(name);
    await page.getByTestId("network-description-input").fill("E2E test network");
    await page.getByTestId("submit-network").click();

    // "Add Resource?" → confirm
    await page.getByTestId("confirmation.confirm").click({ force: true });

    // Resource tab
    const resName = generateRandomName("test-resource-");
    resourceName = resName;
    await page.getByTestId("resource-name-input").fill(resName);
    await page.getByTestId("resource-address-input").fill("10.50.0.1");
    await page.getByTestId("resource-optional-settings").click();
    await page.getByTestId("resource-description-input").fill("E2E test resource");
    await page.getByTestId("resource-continue").click();

    // Access control tab — add policy
    await page.getByTestId("add-policy").click();
    const srcGroup = generateRandomName("net-src-group-");
    policySourceGroup = srcGroup;
    await page.getByTestId("source-group-selector").click();
    await page.getByTestId("source-group-selector-search").fill(srcGroup);
    await page.getByTestId("source-group-selector-search").press("Enter");
    await page.getByTestId("source-group-selector-search").press("Escape");
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("policy-continue").click();
    await page.getByTestId("submit-policy").click();

    // Submit resource
    await page.getByTestId("submit-resource").click();

    // "Add Routing Peer?" → confirm
    await page.getByTestId("confirmation.confirm").click({ force: true });

    // Routing peer
    await page.getByTestId("routing-peer-tab-group").click({ force: true });
    const rpGroup = generateRandomName("net-rp-group-");
    routingPeerGroup = rpGroup;
    await page.getByTestId("group-selector-dropdown").click();
    await page.getByTestId("group-selector-dropdown-search").fill(rpGroup);
    await page.getByTestId("group-selector-dropdown-search").press("Enter");
    await page.getByTestId("group-selector-dropdown-search").press("Escape");
    await page.getByTestId("routing-peer-continue").click();
    await page.getByTestId("toggle-masquerade").click();
    await page.getByTestId("metric").fill("100");
    await page.getByTestId("submit-routing-peer").click();

    // Verify network in table
    await expect(page.locator("tr").filter({ hasText: name })).toBeVisible({ timeout: 10_000 });
  });

  test("Should add a CIDR range resource", async ({ dashboardAsOwner: page }) => {
    await addResourceToNetwork(page, "cidr-resource-", "192.168.100.0/24");
  });

  test("Should add a domain resource", async ({ dashboardAsOwner: page }) => {
    await addResourceToNetwork(page, "domain-resource-", "resource.internal");
  });

  test("Should rename the network from the table", async ({ dashboardAsOwner: page }) => {
    // Page is already on /networks from previous test
    const row = page.locator("tr").filter({ hasText: networkName });
    await expect(row).toBeVisible();

    await row.getByTestId("network-actions").click({ force: true });
    await page.getByTestId("rename-network").click({ force: true });

    const newName = generateRandomName("test-network-");
    await page.getByTestId("network-name-input").fill(newName);
    await page.getByTestId("network-description-input").fill("Updated description");
    await page.getByTestId("submit-network").click();

    await expect(page.locator("tr").filter({ hasText: newName })).toBeVisible({ timeout: 10_000 });
    networkName = newName;
  });

  test("Should navigate to the network detail page and verify tabs", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/networks");
    const row = page.locator("tr").filter({ hasText: networkName });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.locator("button").first().click();

    // Wait for detail page to load (tab bar appears)
    await expect(page.locator('[role="tab"]').filter({ hasText: "Resource" })).toBeVisible();
    await expect(page.getByText(resourceName).first()).toBeVisible({ timeout: 10_000 });

    // Routing Peers tab
    await page.getByTestId("network-tab-routing-peers").click();
    await expect(page.getByText(routingPeerGroup).first()).toBeVisible();

    // Services tab
    await page.getByTestId("network-tab-services").click();
    await expect(page.getByTestId("network-tab-services")).toHaveAttribute("data-state", "active");
  });

  test("Should rename the network from the detail page", async ({ dashboardAsOwner: page }) => {
    // Already on the detail page from previous test
    await page.getByTestId("network-detail-actions").click();
    await page.getByTestId("rename-network").click({ force: true });

    const newName = generateRandomName("test-network-");
    await page.getByTestId("network-name-input").fill(newName);
    await page.getByTestId("network-description-input").fill("Renamed from detail page");
    await page.getByTestId("submit-network").click();

    await expect(page.getByText(newName).first()).toBeVisible();
    networkName = newName;
  });

  test("Should delete the network and clean up", async ({ dashboardAsOwner: page }) => {
    await deleteNetworksByPrefix(page, "test-network-");
    await deletePoliciesByGroupName(page, policySourceGroup);
    await deletePoliciesBySubstring(page, "test-resource-");
    for (const group of [policySourceGroup, routingPeerGroup]) {
      await deleteGroupsByPrefix(page, group);
    }
  });
});

async function addResourceToNetwork(
  page: import("@playwright/test").Page,
  prefix: string,
  address: string,
) {
  // Page should already be on /networks from previous test
  const row = page.locator("tr").filter({ hasText: networkName });
  await expect(row).toBeVisible();

  const name = generateRandomName(prefix);
  // The per-row resource-add affordance is now an icon "Add" button.
  await row.getByTestId("add-resource").click();

  await expect(page.getByTestId("resource-name-input")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("resource-name-input").fill(name);
  await page.getByTestId("resource-address-input").fill(address);
  await page.getByTestId("resource-continue").click();

  await page.getByTestId("submit-resource").click();
  // "No policies configured" warning
  await page.getByTestId("confirmation.confirm").click();
  // "Add Routing Peer?" prompt — wait for it and dismiss
  await page.getByTestId("confirmation.cancel").click();
}

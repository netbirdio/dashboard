/**
 * Shared helpers for L4 reverse proxy tests (TLS, TCP, UDP).
 * Keeps the individual spec files DRY.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { navigateTo } from "./auth";
import { generateRandomName, waitForApiCalls } from "./utils";

/** Create a network and return its name. */
export async function createNetwork(page: Page): Promise<string> {
  // Networks now lives under the collapsible "Network Routing" sidebar
  // group, so navigate by URL instead of clicking the (hidden) child item.
  await navigateTo(page, "/networks");
  const name = generateRandomName("rp-network-");

  await page.getByTestId("add-network").click();
  await page.getByTestId("network-name-input").fill(name);
  await page.getByTestId("submit-network").click();

  await page
    .getByTestId("confirmation.cancel")
    .click({ force: true });

  // force: true because Radix dialog leaves data-scroll-locked on body
  const searchInput = page.getByTestId("table-search-input");
  await searchInput.fill(name, { force: true });
  await expect(page.locator("tr").filter({ hasText: name })).toBeVisible();

  return name;
}

/** Add a resource to an already-visible network row. */
export async function addResource(
  page: Page,
  networkName: string,
  address: string,
): Promise<string> {
  const name = generateRandomName("rp-resource-");

  const searchInput = page.getByTestId("table-search-input");
  await searchInput.fill(networkName, { force: true });
  await page
    .locator("tr")
    .filter({ hasText: networkName })
    .getByTestId("add-resource")
    .click({ force: true });

  await page.getByTestId("resource-name-input").fill(name);
  await page.getByTestId("resource-address-input").fill(address);
  await page.getByTestId("resource-continue").click();

  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/networks/") &&
      resp.url().includes("/resources") &&
      resp.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByTestId("submit-resource").click();
  await page
    .getByTestId("confirmation.confirm")
    .click({ force: true });
  const response = await responsePromise;
  expect([200, 201]).toContain(response.status());

  await page
    .getByTestId("confirmation.cancel")
    .click({ force: true });

  return name;
}

/** Domains advertised by the test reverse-proxy clusters. */
export const CUSTOM_PORTS_DOMAIN = "example.com";
export const NO_CUSTOM_PORTS_DOMAIN = "noports.example.com";

/** Pick a base domain (cluster) in the service modal — deterministic when multiple clusters exist. */
export async function selectProxyDomain(page: Page, domain: string) {
  const trigger = page.getByTestId("proxy-domain-selector");
  await trigger.click({ force: true });
  // Find the option whose label span contains the exact ".<domain>" text,
  // so ".example.com" doesn't also match ".noports.example.com".
  const option = page
    .locator('[role="option"]')
    .filter({ has: page.getByText(`.${domain}`, { exact: true }) })
    .first();
  await option.click({ force: true });
  // Wait for the trigger to reflect the new selection and the popover
  // options to detach, so subsequent clicks aren't intercepted by Radix's
  // outside-click handling during the close animation.
  await expect(trigger.getByText(`.${domain}`, { exact: true })).toBeVisible();
  await option.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
}

/** Select a resource target in the L4 target selector. */
export async function selectL4Resource(page: Page, resourceName: string) {
  await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("group-selector-dropdown").click();
  await page
    .locator('[role="tab"]')
    .filter({ hasText: "Resources" })
    .click({ force: true });
  const search = page.getByTestId("group-selector-dropdown-search");
  await expect(search).toBeVisible({ timeout: 5_000 });
  await search.fill(resourceName);
  await page
    .locator('[role="option"], [role="listbox"] >> text=' + resourceName)
    .or(page.getByText(resourceName))
    .first()
    .click({ force: true, timeout: 15_000 });
}

/** Add the standard two access control rules (Allow Germany + Block IP). */
export async function addAccessControlRules(page: Page) {
  // Rule 1: Allow Country (Germany)
  await page.getByTestId("add-access-rule").click();
  await page.getByTestId("access-rule-0").getByText("Select country...").click();
  await page
    .getByTestId("select-dropdown-search")
    .fill("Germany");
  await page.getByText("Germany (DE)").click({ force: true });

  // Rule 2: Block IP Address
  await page.getByTestId("add-access-rule").click();
  await page
    .getByTestId("access-rule-1")
    .getByTestId("access-rule-action")
    .click();
  await page.getByText("Block Only").click({ force: true });
  await page
    .getByTestId("access-rule-1")
    .getByTestId("access-rule-type")
    .click();
  await page.locator('[role="option"]').filter({ hasText: "IP Address" }).click({ force: true });
  const ipInput = page.getByTestId("access-rule-1").getByTestId("access-rule-value");
  await expect(ipInput).toBeVisible();
  await ipInput.fill("85.203.15.42");
}

/** Remove all access control rules (expects exactly 2). */
export async function removeAllAccessControlRules(page: Page) {
  await expect(page.getByTestId("remove-access-rule")).toHaveCount(2);
  await page.getByTestId("remove-access-rule").last().click({ force: true });
  await page.getByTestId("remove-access-rule").first().click({ force: true });
}

/** Reset any stale filters/search so all services are visible in the table. */
export async function resetServiceFilters(page: Page) {
  const resetBtn = page.getByTestId("reset-filters-and-search");
  if (await resetBtn.isVisible().catch(() => false)) {
    await resetBtn.click();
  }
}

/**
 * Navigate to a reverse-proxy page and wait for every /api/reverse-prox*
 * backend call triggered by the navigation to finish before proceeding,
 * so the table/picker is fully populated when the test interacts with it.
 */
export async function gotoReverseProxyPage(
  page: Page,
  path = "/reverse-proxy/services",
) {
  await waitForApiCalls(page, () => navigateTo(page, path));
}

/** Open the edit modal for a service row. */
export async function openServiceEdit(page: Page, subdomain: string) {
  await gotoReverseProxyPage(page, "/reverse-proxy/services");
  await resetServiceFilters(page);
  await page
    .locator("tr")
    .filter({ hasText: subdomain })
    .getByTestId("service-actions")
    .click({ force: true });
  await page.getByTestId("edit-service").click({ force: true });
  // Wait for the edit modal to fully load
  await expect(page.getByTestId("proxy-save")).toBeVisible({ timeout: 10_000 });
}

/** Delete a service via the action dropdown and confirm. */
export async function deleteService(page: Page, subdomain: string) {
  await page
    .locator("tr")
    .filter({ hasText: subdomain })
    .getByTestId("service-actions")
    .click({ force: true });
  await page.getByTestId("delete-service").click({ force: true });
  await page
    .getByTestId("confirmation.confirm")
    .click({ force: true });

  await expect(
    page.locator("tr").filter({ hasText: subdomain }),
  ).not.toBeVisible({ timeout: 15_000 });
}

/** Save an edited service (handles the "No Protection" confirmation). */
export async function saveServiceEdit(page: Page) {
  await page.getByTestId("proxy-save").click();
  await page
    .getByTestId("confirmation.confirm")
    .click({ force: true });
}

/** Navigate to Networks, find the network by name, and delete it. */
export async function deleteNetwork(page: Page, networkName: string) {
  await navigateTo(page, "/networks");
  const searchInput = page.getByTestId("table-search-input");
  await expect(searchInput).toBeVisible({ timeout: 30_000 });
  await searchInput.fill(networkName, { force: true });
  await expect(
    page.locator("tr").filter({ hasText: networkName }),
  ).toBeVisible();

  // Open the row's action menu (last button) and click Delete
  await page
    .locator("tr")
    .filter({ hasText: networkName })
    .locator("button")
    .last()
    .click({ force: true });
  await page.getByText("Delete").click({ force: true });
  await page
    .getByTestId("confirmation.confirm")
    .click({ force: true });

  await expect(
    page.locator("tr").filter({ hasText: networkName }),
  ).not.toBeVisible();
}

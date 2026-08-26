import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteNetworksByPrefix, deleteServicesByPrefix } from "../helpers/api";
import { gotoReverseProxyPage, selectProxyDomain, CUSTOM_PORTS_DOMAIN } from "../helpers/reverse-proxy-l4";

let createdNetwork = "";
let createdResource = "";
let createdSubdomain = "";

test.describe.serial("Reverse Proxy - Services (HTTPS) @reverse-proxy", () => {
  test("Should create a network with a resource", async ({ dashboardAsOwner: page }) => {
    // Clean up leftovers from previous runs (unique prefix per protocol)
    await deleteServicesByPrefix(page, "https-svc-");
    await deleteNetworksByPrefix(page, "rp-https-net-");
    await navigateTo(page, "/networks");
    const name = generateRandomName("rp-https-net-");
    createdNetwork = name;
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(name);
    await page.getByTestId("submit-network").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });

    // Add resource
    const resName = generateRandomName("rp-resource-");
    createdResource = resName;
    await page.getByTestId("resource-name-input").fill(resName);
    await page.getByTestId("resource-address-input").fill("10.99.99.10");
    await page.getByTestId("resource-continue").click();

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/networks/") &&
        resp.url().includes("/resources") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-resource").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await responsePromise;
    await page.getByTestId("confirmation.cancel").click({ force: true });
  });

  test("Should create an HTTPS reverse proxy service with full configuration", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(60_000);
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    const subdomain = generateRandomName("https-svc-");
    createdSubdomain = subdomain;

    await page.getByTestId("add-service").first().click();
    await expect(page.getByTestId("proxy-subdomain-input")).toBeVisible({ timeout: 10_000 });

    // Step 1: Service
    await page.getByTestId("proxy-subdomain-input").fill(subdomain);
    await selectProxyDomain(page, CUSTOM_PORTS_DOMAIN);

    // Add 2 targets: http with options, https with port
    await addTarget(page, {
      resourceName: createdResource,
      protocol: "http",
      timeout: "10s",
      customHeader: { name: "X-Custom-Header", value: "custom-value" },
    });
    await addTarget(page, {
      resourceName: createdResource,
      location: "/secure",
      protocol: "https",
      port: 4433,
    });

    const targetsSection = page.getByText("HTTPS Targets").locator("..");
    await expect(targetsSection.locator("table tbody tr")).toHaveCount(2);

    await page.getByTestId("proxy-continue").click();

    // Step 2: Authentication
    await page.getByTestId("auth-sso-card").click();
    await page.getByTestId("submit-sso").click();

    await page.getByTestId("auth-password-card").click();
    await page.getByTestId("password-input").fill("super-secret-pass");
    await page.getByTestId("submit-password").click();

    await page.getByTestId("auth-pin-card").click();
    const pinInputs = page.locator('input[inputmode="numeric"][maxlength="1"]');
    for (let i = 0; i < 6; i++) {
      await pinInputs.nth(i).fill(String(i + 1), { force: true });
    }
    await page.getByTestId("submit-pin").click();

    await page.getByTestId("auth-header-card").click();
    await page.getByTestId("header-type-select").click();
    await page.locator("[cmdk-list]").getByText("Basic Auth").click({ force: true });
    await page.getByTestId("header-basic-username").fill("admin");
    await page.getByTestId("header-basic-password").fill("admin-pass");
    await page.getByTestId("submit-headers").click();

    await page.getByTestId("proxy-continue").click();

    // Step 3: Access Control
    await page.getByTestId("add-access-rule").click();
    await page.getByTestId("access-rule-0").getByText("Select country...").click();
    await page.getByTestId("select-dropdown-search").fill("Germany");
    await page.getByText("Germany (DE)").click({ force: true });

    await page.getByTestId("add-access-rule").click();
    await page.getByTestId("access-rule-1").getByTestId("access-rule-action").click();
    await page.getByText("Block Only").click({ force: true });
    await page.getByTestId("access-rule-1").getByTestId("access-rule-type").click();
    await page.locator('[role="option"]').filter({ hasText: "IP Address" }).click({ force: true });
    const ipInput = page.getByTestId("access-rule-1").getByTestId("access-rule-value");
    await expect(ipInput).toBeVisible();
    await ipInput.fill("85.203.15.42");

    await page.getByTestId("proxy-continue").click();

    // Step 4: Advanced Settings
    await page.getByTestId("toggle-pass-host-header").click();
    await page.getByTestId("toggle-rewrite-redirects").click();
    await page.getByTestId("submit-service").click();

    await expect(page.locator("tr").filter({ hasText: subdomain })).toBeVisible({ timeout: 30_000 });
  });

  test("Should edit the service, remove auth and rules, then delete", async ({
    dashboardAsOwner: page,
  }) => {
    await resetServiceFilters(page);
    await page.locator("tr").filter({ hasText: createdSubdomain }).getByTestId("service-actions").click({ force: true });
    await page.getByTestId("edit-service").click({ force: true });

    // Edit first target
    const targetsSection = page.getByText("HTTPS Targets").locator("..");
    await targetsSection.locator("table tbody tr").first().click({ force: true });
    await page.getByTestId("target-location-input").fill("/new-location");
    await page.getByTestId("submit-target").click();

    // Remove second target
    await targetsSection.locator("table tbody tr").filter({ hasText: "/secure" }).getByTestId("target-row-actions").click();
    await page.getByTestId("remove-target").click();
    await expect(targetsSection.locator("table tbody tr")).toHaveCount(1);

    // Remove all auth methods — click Edit on each card, then Remove in the modal
    await page.getByTestId("proxy-tab-auth").click({ force: true });
    await removeAuthMethod(page, "auth-sso-card", "remove-sso");
    await removeAuthMethod(page, "auth-password-card", "remove-password");
    await removeAuthMethod(page, "auth-pin-card", "remove-pin");
    await removeAuthMethod(page, "auth-header-card", "remove-headers");

    // Remove access control rules
    await page.getByTestId("proxy-tab-access-control").click({ force: true });
    await page.getByTestId("remove-access-rule").last().click({ force: true });
    await page.getByTestId("remove-access-rule").first().click({ force: true });

    // Toggle advanced settings back
    await page.getByTestId("proxy-tab-settings").click({ force: true });
    await page.getByTestId("toggle-pass-host-header").click({ force: true });
    await page.getByTestId("toggle-rewrite-redirects").click({ force: true });

    // Save and wait for API response
    const saveResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/reverse-proxies/services") &&
        resp.request().method() === "PUT",
      { timeout: 15_000 },
    );
    await page.getByTestId("proxy-save").click();
    const confirmBtn = page.getByTestId("confirmation.confirm");
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
    }
    await saveResponse;

    // Verify no auth / no access rules: both cells now show a "0" count badge.
    await resetServiceFilters(page);
    const row = page.locator("tr").filter({ hasText: createdSubdomain });
    await expect(row.locator("[data-auth-cell]")).toContainText("0", {
      timeout: 15_000,
    });
    await expect(
      row.locator("[data-access-control-cell]"),
    ).toContainText("0", { timeout: 15_000 });

    // Delete the service
    await row.getByTestId("service-actions").click({ force: true });
    await page.getByTestId("delete-service").click({ force: true });
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await expect(row).not.toBeVisible();
  });

  test("Should delete the network", async ({ dashboardAsOwner: page }) => {
    await deleteNetworksByPrefix(page, createdNetwork);
  });
});

async function resetServiceFilters(page: import("@playwright/test").Page) {
  const resetBtn = page.getByTestId("reset-filters-and-search");
  if (await resetBtn.isVisible().catch(() => false)) {
    await resetBtn.click();
  }
}

type AddTargetOptions = {
  resourceName: string;
  location?: string;
  protocol?: "http" | "https";
  port?: number;
  timeout?: string;
  customHeader?: { name: string; value: string };
};

async function addTarget(page: import("@playwright/test").Page, opts: AddTargetOptions) {
  await page.getByTestId("add-target").scrollIntoViewIfNeeded();
  await page.getByTestId("add-target").click();
  await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({ timeout: 10_000 });

  await page.getByTestId("group-selector-dropdown").click();
  await page.locator('[role="tab"]').filter({ hasText: "Resources" }).click({ force: true });
  const search = page.getByTestId("group-selector-dropdown-search");
  await expect(search).toBeVisible({ timeout: 5_000 });
  await search.fill(opts.resourceName);
  await page.getByText(opts.resourceName).click({ force: true, timeout: 15_000 });
  await expect(page.getByTestId("target-port-input")).toBeVisible({ timeout: 10_000 });

  if (opts.location) {
    await expect(page.getByTestId("target-location-input")).toBeEnabled({ timeout: 5_000 });
    await page.getByTestId("target-location-input").fill(opts.location);
  }

  if (opts.protocol === "https") {
    await page.getByTestId("target-protocol-select").click();
    await page.locator("[cmdk-list]").getByText("https://").click({ force: true });
  }

  if (opts.port !== undefined) {
    await page.getByTestId("target-port-input").fill(String(opts.port));
  } else {
    await page.getByTestId("target-port-input").fill("");
  }

  if (opts.timeout || opts.customHeader) {
    await page.getByTestId("target-optional-settings").click();
    if (opts.timeout) {
      await page.getByTestId("target-timeout-input").fill(opts.timeout);
    }
    if (opts.customHeader) {
      await page.getByTestId("add-custom-header").click();
      await page.getByTestId("custom-header-name-0").fill(opts.customHeader.name);
      await page.getByTestId("custom-header-value-0").fill(opts.customHeader.value);
    }
  }

  await page.getByTestId("submit-target").click();
}

async function removeAuthMethod(
  page: import("@playwright/test").Page,
  cardTestId: string,
  removeTestId: string,
) {
  const card = page.getByTestId(cardTestId);
  const removeBtn = page.getByTestId(removeTestId);

  // Click the card to open the auth modal
  await card.click();
  await expect(removeBtn).toBeVisible();
  await removeBtn.click();

  // Wait for the modal to fully close — the remove button must disappear
  // and the "Enabled" badge on the card should also disappear
  await expect(removeBtn).not.toBeVisible();
  await expect(card.getByText("Enabled")).not.toBeVisible();
}

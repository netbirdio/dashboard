import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { applyRadioTableFilter, generateRandomName } from "../helpers/utils";
import { gotoReverseProxyPage } from "../helpers/reverse-proxy-l4";

let domain = "";
const TARGET_CLUSTER = "example.com";

test.describe.serial("Reverse Proxy - Custom Domains @reverse-proxy", () => {
  test("Should validate domain input and add a custom domain", async ({
    dashboardAsOwner: page,
  }) => {
    await gotoReverseProxyPage(page, "/reverse-proxy/custom-domains");

    await page.getByTestId("add-custom-domain").click();
    await expect(page.getByTestId("custom-domain-input")).toBeVisible();

    // Invalid input should show error
    await page.getByTestId("custom-domain-input").fill("mycustomdomain");
    await page.getByTestId("custom-domain-input").blur();
    await expect(page.getByText("Please enter a valid TLD domain")).toBeVisible();

    // Fill valid domain — error should disappear
    const prefix = generateRandomName("mycustomdomain-");
    domain = `${prefix}.com`;
    await page.getByTestId("custom-domain-input").fill(domain);
    await expect(page.getByText("Please enter a valid TLD domain")).toHaveCount(0);

    // Pick the target proxy cluster explicitly — with multiple clusters the
    // dashboard does not auto-select.
    const clusterSection = page.getByTestId("custom-domain-cluster-selector");
    await clusterSection.locator("button").first().click({ force: true });
    await page
      .locator('[role="option"]')
      .filter({ has: page.getByText(TARGET_CLUSTER, { exact: true }) })
      .first()
      .click({ force: true });

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/reverse-proxies/domains") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-custom-domain").click();
    const response = await responsePromise;
    expect([200, 201]).toContain(response.status());

    await expect(page.getByRole("heading", { name: "Verify Domain" })).toBeVisible();
    await expect(page.getByText(`*.${domain}`)).toBeVisible();

    await page.getByTestId("verify-domain-later").click();

    const row = page.locator("tr").filter({ hasText: domain });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Pending Verification");
    await expect(row).toContainText(TARGET_CLUSTER);
  });

  test("Should filter domains by Pending and Active", async ({ dashboardAsOwner: page }) => {
    await applyRadioTableFilter(page, "validated", "Pending");
    await expect(page.locator("tr").filter({ hasText: domain })).toBeVisible();

    await applyRadioTableFilter(page, "validated", "Active");
    await expect(page.locator("tr").filter({ hasText: domain })).not.toBeVisible();

    await applyRadioTableFilter(page, "validated", "All");
    await expect(page.locator("tr").filter({ hasText: domain })).toBeVisible();
  });

  test("Should search for the domain", async ({ dashboardAsOwner: page }) => {
    const searchInput = page.getByTestId("table-search-input");
    await searchInput.fill(domain);
    await expect(page.locator("tr").filter({ hasText: domain })).toBeVisible();
    await searchInput.fill("");
  });

  test("Should delete the custom domain", async ({ dashboardAsOwner: page }) => {
    await page
      .locator("tr")
      .filter({ hasText: domain })
      .getByTestId("delete-custom-domain")
      .click();
    await page.getByTestId("confirmation.confirm").click();
    await expect(page.locator("tr").filter({ hasText: domain })).not.toBeVisible();
  });
});

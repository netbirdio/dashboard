import { expect, test } from "../helpers/fixtures";
import { loginToApp, navigateTo } from "../helpers/auth";
import { deleteUserByEmail } from "../helpers/api";

test.setTimeout(60_000);

test.describe.serial("User Approval & Billing Admin @team", () => {
  // ── User Approval ────────────────────────────────────────────────────

  test("Should show approval pending for the second user", async ({
    browser,
    dashboardAsOwner: ownerPage,
  }) => {
    // Clean up user from previous runs so approval flow starts fresh
    await deleteUserByEmail(ownerPage, "user@localhost.test");

    const context = await browser.newContext({
      storageState: "e2e/fixtures/auth/user.json",
    });
    const page = await context.newPage();
    await loginToApp(page, "user");
    await expect(page.getByText("User Approval Pending")).toBeVisible();
    await context.close();
  });

  test("Should approve the pending user", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/team/users");

    const pendingRow = page.locator("tr").filter({ hasText: "Pending" });
    await expect(pendingRow).toBeVisible();
    await pendingRow.getByRole("button", { name: "Approve" }).click();
    await expect(pendingRow).not.toBeVisible();
  });

  test("Should delete the approved user", async ({
    dashboardAsOwner: page,
  }) => {
    const userRow = page
      .locator("tr")
      .filter({ hasText: "user@localhost.test" });
    await expect(userRow).toBeVisible();
    // Row actions are now behind a dropdown menu.
    await userRow.getByTestId("user-actions").click({ force: true });
    await page.getByTestId("delete-user").click({ force: true });
    await page.getByTestId("confirmation.confirm").click();
    await expect(userRow).not.toBeVisible();
  });

  // ── Billing Admin ────────────────────────────────────────────────────

  test("Should login as second user to trigger registration", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: "e2e/fixtures/auth/user.json",
    });
    const page = await context.newPage();
    await loginToApp(page, "user");
    await context.close();
  });

  test("Should approve user and assign Billing Admin role", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/team/users");

    const pendingRow = page.locator("tr").filter({ hasText: "Pending" });
    if (await pendingRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pendingRow.getByRole("button", { name: "Approve" }).click();
      await expect(pendingRow).not.toBeVisible();
    }

    const userRow = page
      .locator("tr")
      .filter({ hasText: "user@localhost.test" });
    await expect(userRow).toBeVisible();
    await userRow.getByTestId("user-name-cell").click();
    await expect(
      page.getByTestId("breadcrumb-item").filter({ hasText: /^user/i }),
    ).toBeVisible();

    await expect(page.getByTestId("user-role-selector")).toBeEnabled({
      timeout: 15_000,
    });
    const currentRole = await page
      .getByTestId("user-role-selector")
      .textContent();
    if (!currentRole?.includes("Billing Admin")) {
      await page.getByTestId("user-role-selector").click();
      await page
        .getByTestId("user-role-selector-item")
        .filter({ hasText: "Billing Admin" })
        .click();
      await page.getByTestId("save-changes").click();
    }
  });

  test("Should show Plans & Billing and Invoices for the Billing Admin", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: "e2e/fixtures/auth/user.json",
    });
    const page = await context.newPage();
    await loginToApp(page, "user");

    await expect(page.getByTestId("user-dropdown")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("user-dropdown").click({ force: true });
    await page.getByText("Plans & Billing").click();

    await expect(
      page.getByTestId("settings-tab-plans-and-billing"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("settings-tab-invoices")).toBeVisible();
    await expect(
      page.getByTestId("settings-content-plans-and-billing"),
    ).toBeVisible();

    await page.getByTestId("settings-tab-invoices").click();
    await expect(page.getByTestId("settings-content-invoices")).toBeVisible();

    await expect(
      page.getByTestId("settings-tab-authentication"),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("settings-tab-permissions"),
    ).not.toBeVisible();
    await expect(page.getByTestId("settings-tab-clients")).not.toBeVisible();

    await context.close();
  });

  test("Should delete the second user", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/team/users");

    const userRow = page
      .locator("tr")
      .filter({ hasText: "user@localhost.test" });
    await expect(userRow).toBeVisible();
    // Row actions are now behind a dropdown menu.
    await userRow.getByTestId("user-actions").click({ force: true });
    await page.getByTestId("delete-user").click({ force: true });
    await page.getByTestId("confirmation.confirm").click();
    await expect(userRow).not.toBeVisible();
  });
});

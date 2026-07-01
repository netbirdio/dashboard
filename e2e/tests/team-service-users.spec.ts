import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";

let regularUser = "";
let adminServiceUser = "";

test.describe.serial("Team - Service Users @team", () => {
  test("Should create service users and verify roles", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/team/service-users");

    regularUser = generateRandomName("svc-user-");
    adminServiceUser = generateRandomName("svc-admin-");

    await createServiceUser(page, regularUser, "User");
    await createServiceUser(page, adminServiceUser, "Admin");

    await checkServiceUserRow(page, regularUser, "User");
    await checkServiceUserRow(page, adminServiceUser, "Admin");
  });

  test("Should update role and manage access tokens", async ({ dashboardAsOwner: page }) => {
    await page.locator("tr").getByText(regularUser).click();
    await changeRoleTo(page, "Admin");
    await page.getByTestId("save-changes").click();

    // Create and delete access token
    const tokenName = generateRandomName("tkn_");
    await page.getByTestId("access-token-open-modal").click();
    await page.getByTestId("access-token-name").fill(tokenName);
    await page.getByTestId("access-token-expires-in").fill("30");
    await page.getByTestId("create-access-token").click();
    await expect(page.getByTestId("access-token-copy-close")).toBeVisible();
    await page.getByTestId("access-token-copy-close").click();

    const tokenRow = page.locator("tr").filter({ hasText: tokenName });
    await tokenRow.getByTestId("access-token-delete").click();
    await page.getByTestId("confirmation.confirm").click();
    await expect(tokenRow).not.toBeVisible();

    await page.getByText("Service Users").first().click();
  });

  test("Should update admin user role and verify all changes persisted", async ({
    dashboardAsOwner: page,
  }) => {
    await page.locator("tr").getByText(adminServiceUser).click();
    await changeRoleTo(page, "User");
    const saveResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/users/") && resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("save-changes").click();
    await saveResponse;

    await page.getByText("Service Users").first().click();
    await checkServiceUserRow(page, regularUser, "Admin");
    await checkServiceUserRow(page, adminServiceUser, "User");

    // Single reload to verify all changes persisted
    await page.reload();
    await checkServiceUserRow(page, regularUser, "Admin");
    await checkServiceUserRow(page, adminServiceUser, "User");
  });

  test("Should delete service users", async ({ dashboardAsOwner: page }) => {
    for (const name of [regularUser, adminServiceUser]) {
      const row = page.locator("tr").filter({ hasText: name });
      // Row actions are now behind a dropdown menu; open it, then delete.
      await row.getByTestId("user-actions").click({ force: true });
      await page.getByTestId("delete-user").click({ force: true });
      await page.getByTestId("confirmation.confirm").click();
      await expect(row).not.toBeVisible();
    }
  });
});

async function createServiceUser(
  page: import("@playwright/test").Page,
  name: string,
  role: string,
) {
  await page.getByTestId("open-service-user-modal").click();
  await expect(page.getByTestId("service-user-name")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("service-user-name").fill(name);
  await page.getByTestId("user-role-selector").click({ force: true });
  await page
    .getByTestId("user-role-selector-item")
    .getByText(role, { exact: true })
    .click({ force: true });
  await page.getByTestId("create-service-user").click();
  // Wait for modal to close
  await expect(page.getByTestId("service-user-name")).not.toBeVisible({ timeout: 5_000 });
}

async function checkServiceUserRow(
  page: import("@playwright/test").Page,
  name: string,
  role: string,
) {
  const row = page.locator("tr").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(row.getByText(role, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
}

async function changeRoleTo(
  page: import("@playwright/test").Page,
  role: string,
) {
  await page.getByTestId("user-role-selector").click();
  await page
    .getByTestId("user-role-selector-item")
    .getByText(role, { exact: true })
    .click();
}

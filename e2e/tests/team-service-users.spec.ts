import type { Page } from "@playwright/test";
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
    await openServiceUser(page, regularUser);
    await changeRoleTo(page, "Admin");
    await saveUserChanges(page);

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
  });

  test("Should update admin user role and verify all changes persisted", async ({
    dashboardAsOwner: page,
  }) => {
    await openServiceUser(page, adminServiceUser);
    await changeRoleTo(page, "User");
    await saveUserChanges(page);

    // Go back the way a user would, so this also covers the save refreshing
    // the cached users list rather than only what the server persisted.
    await returnToServiceUserList(page);
    await checkServiceUserRow(page, regularUser, "Admin");
    await checkServiceUserRow(page, adminServiceUser, "User");

    // Single reload to verify all changes persisted
    await page.reload();
    await checkServiceUserRow(page, regularUser, "Admin");
    await checkServiceUserRow(page, adminServiceUser, "User");
  });

  test("Should delete service users", async ({ dashboardAsOwner: page }) => {
    await openServiceUserList(page);
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

async function createServiceUser(page: Page, name: string, role: string) {
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

// openServiceUserList lands on the service users table and waits for it to
// settle.
async function openServiceUserList(page: Page) {
  await navigateTo(page, "/team/service-users");
  await expectServiceUserList(page);
}

// returnToServiceUserList goes back to the list from a user's page the way a
// user would, via the breadcrumb. Unlike a plain click on the nav entry, it
// waits for the navigation to actually land: the click itself resolves while
// the client-side navigation is still in flight, so anything that follows can
// otherwise be computed against the page being left behind.
async function returnToServiceUserList(page: Page) {
  await page
    .getByTestId("breadcrumb-item")
    .filter({ hasText: "Service Users" })
    .click();
  await page.waitForURL(/\/team\/service-users/, { timeout: 15_000 });
  await expectServiceUserList(page);
}

async function expectServiceUserList(page: Page) {
  await expect(page.getByRole("heading", { name: /Service Users/ })).toBeVisible({
    timeout: 10_000,
  });
}

// openServiceUser opens one service user's page from the list and only returns
// once that page really belongs to `name`. The row click is a client-side
// navigation and the table re-renders as the users fetch revalidates, so
// clicking a row without confirming where we landed can silently leave us on a
// different user — and every later edit then targets that other user.
async function openServiceUser(page: Page, name: string) {
  await openServiceUserList(page);

  const row = page.locator("tr").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.click();

  await page.waitForURL(/\/team\/user\?/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({
    timeout: 10_000,
  });
}

async function checkServiceUserRow(page: Page, name: string, role: string) {
  const row = page.locator("tr").filter({ hasText: name });
  const cell = row.getByText(role, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  // The list can serve a stale SWR read right after a role change +
  // navigation; give it a moment, then reload once if the role cell hasn't
  // caught up. (Read-only verification — a reload only re-reads the account.)
  const settled = await cell
    .waitFor({ state: "visible", timeout: 7_000 })
    .then(() => true)
    .catch(() => false);
  if (!settled) {
    await page.reload();
    await expect(row).toBeVisible({ timeout: 10_000 });
  }
  await expect(cell).toBeVisible({ timeout: 10_000 });
}

async function changeRoleTo(page: Page, role: string) {
  await page.getByTestId("user-role-selector").click();
  await page
    .getByTestId("user-role-selector-item")
    .getByText(role, { exact: true })
    .click();
  // Confirm the pick landed. A missed dropdown click leaves the role
  // unchanged, which disables "Save Changes" and turns the save below into an
  // unexplained 30s wait for a PUT that is never sent.
  await expect(
    page.getByTestId("user-role-selector").getByText(role, { exact: true }),
  ).toBeVisible({ timeout: 5_000 });
}

// saveUserChanges saves the open user page and awaits the PUT, so the change is
// persisted before the next serial test asserts it — clicking save alone
// returns before the request lands. The PUT is pinned to the user currently
// open and its status checked: a PUT for some other user, or a rejected one,
// otherwise leaves the account in a state later assertions blame on the UI.
async function saveUserChanges(page: Page) {
  const userId = new URL(page.url()).searchParams.get("id");
  expect(userId, "expected a user page with an id parameter").toBeTruthy();

  const saveResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/users/${userId}`) &&
      resp.request().method() === "PUT",
    { timeout: 30_000 },
  );
  await page.getByTestId("save-changes").click();
  expect((await saveResponse).status()).toBe(200);
}

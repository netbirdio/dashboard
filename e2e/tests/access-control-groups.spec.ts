import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix } from "../helpers/api";

let createdGroupName = "";

const ALL_GROUP_TABS = [
  "policies",
  "resources",
  "network-routes",
  "nameservers",
  "zones",
];

const REGULAR_GROUP_TABS = [
  "users",
  "peers",
  ...ALL_GROUP_TABS,
  "setup-keys",
];

test.describe.serial("Groups @access-control", () => {
  // ── List page tests (no navigation between these) ──────────────────

  test('Should show the "All" group in the list', async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/groups");
    await expect(
      page.locator('[aria-label="View details of group All"]'),
    ).toBeVisible();
  });

  test('Should search for "All" group and still find it', async ({ dashboardAsOwner: page }) => {
    const input = page.getByTestId("table-search-input");
    await input.fill("All");
    await expect(
      page.locator('[aria-label="View details of group All"]'),
    ).toBeVisible();
    await input.fill("");
  });

  test("Should create a new group", async ({ dashboardAsOwner: page }) => {
    const name = generateRandomName("test-group-");
    createdGroupName = name;
    await page.getByTestId("open-create-group").click();
    await page.getByTestId("group-name-input").fill(name);
    await page.getByTestId("create-group").click();
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test("Should rename the group", async ({ dashboardAsOwner: page }) => {
    // Go back to list via breadcrumb (client-side nav, faster than navigateTo)
    await page.getByText("Groups").first().click();
    const input = page.getByTestId("table-search-input");
    await expect(input).toBeVisible();
    await input.fill(createdGroupName);
    await page
      .locator("tr")
      .filter({ hasText: createdGroupName })
      .getByTestId("group-actions")
      .click();
    await page.getByTestId("rename-group").click();

    const newName = generateRandomName("renamed-group-");
    await page.getByTestId("group-name-input").fill(newName);
    await page.getByTestId("save-group-name").click();
    await expect(page.getByText(newName).first()).toBeVisible();
    createdGroupName = newName;
  });

  // ── Detail page tests ──────────────────────────────────────────────

  test('Should open "All" group page and show only All-group tabs', async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/groups");
    const input = page.getByTestId("table-search-input");
    await input.fill("");
    await page.locator('[aria-label="View details of group All"]').click({ force: true });

    for (const tab of ALL_GROUP_TABS) {
      await expect(page.getByTestId(`group-tab-${tab}`)).toBeVisible();
    }
    for (const tab of ["users", "peers", "setup-keys"]) {
      await expect(page.getByTestId(`group-tab-${tab}`)).not.toBeVisible();
    }
    for (const tab of ALL_GROUP_TABS) {
      await page.getByTestId(`group-tab-${tab}`).click({ force: true });
      await expect(page.getByTestId(`group-tab-${tab}`)).toHaveAttribute("data-state", "active");
    }
  });

  test("Should open the new group page and show all 8 tabs", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/groups");
    const input = page.getByTestId("table-search-input");
    await expect(input).toBeVisible();
    await input.fill(createdGroupName);
    await page.locator(`[aria-label="View details of group ${createdGroupName}"]`).click({ force: true });

    for (const tab of REGULAR_GROUP_TABS) {
      await expect(page.getByTestId(`group-tab-${tab}`)).toBeVisible();
    }
    for (const tab of REGULAR_GROUP_TABS) {
      await page.getByTestId(`group-tab-${tab}`).click({ force: true });
      await expect(page.getByTestId(`group-tab-${tab}`)).toHaveAttribute("data-state", "active");
    }
  });

  // ── Cleanup ────────────────────────────────────────────────────────

  test("Should delete the created group", async ({ dashboardAsOwner: page }) => {
    await deleteGroupsByPrefix(page, createdGroupName);
  });
});

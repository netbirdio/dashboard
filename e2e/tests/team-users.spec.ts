import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix } from "../helpers/api";

let createdGroupName = "";

test.describe.serial("Team - Users @team", () => {
  test('Should show the owner with "You" badge and "Owner" role', async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/team/users");

    const ownerRow = page
      .getByTestId("user-name-cell")
      .filter({ hasText: "You" })
      .locator("xpath=ancestor::tr");
    await expect(ownerRow).toBeVisible();
    await expect(ownerRow.getByText("Owner", { exact: true })).toBeVisible();
  });

  test("Should open the user detail page with Peers and Access Tokens tabs", async ({
    dashboardAsOwner: page,
  }) => {
    await openOwnerDetailPage(page);

    await expect(page.getByTestId("user-tab-peers")).toBeVisible();
    await expect(page.getByTestId("user-tab-access-tokens")).toBeVisible();

    await page.getByTestId("user-tab-peers").click();
    await expect(page.getByText("View all peers registered by this user.")).toBeVisible();

    await page.getByTestId("user-tab-access-tokens").click();
    await expect(page.getByText("Access tokens give access to NetBird API.")).toBeVisible();
  });

  test("Should add an auto-assigned group, save, and verify persistence", async ({
    dashboardAsOwner: page,
  }) => {
    // Go back to users list via breadcrumb
    await page.getByTestId("breadcrumb-item").filter({ hasText: "Users" }).click();
    await openOwnerDetailPage(page);

    const name = generateRandomName("user-group-");
    createdGroupName = name;

    await page.getByTestId("user-group-selector").click();
    const search = page.getByTestId("user-group-selector-search");
    await expect(search).toBeVisible();
    await search.fill(name);
    await search.press("Enter");
    await expect(
      page.getByTestId("user-group-selector").getByText(name),
    ).toBeVisible();
    await search.press("Escape");

    const saveResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/users/") && resp.request().method() === "PUT",
      { timeout: 30_000 },
    );
    await page.getByTestId("save-changes").click();
    await saveResponse;
    await expect(
      page.getByTestId("user-group-selector").getByText(name),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId("user-group-selector").getByText(name),
    ).toBeVisible();
  });

  test("Should remove the auto-assigned group, save, and verify removal", async ({
    dashboardAsOwner: page,
  }) => {
    // Already on user detail page from previous test (after reload)
    await page
      .getByTestId("user-group-selector")
      .getByTestId("group-badge")
      .filter({ hasText: createdGroupName })
      .click();

    await page.getByTestId("save-changes").click();
    await expect(
      page.getByTestId("user-group-selector").getByText(createdGroupName),
    ).not.toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId("user-group-selector").getByText(createdGroupName),
    ).not.toBeVisible();
  });

  test("Should delete the created group", async ({ dashboardAsOwner: page }) => {
    await deleteGroupsByPrefix(page, createdGroupName);
  });
});

async function openOwnerDetailPage(page: import("@playwright/test").Page) {
  await page.getByTestId("user-name-cell").filter({ hasText: "You" }).click();
  await expect(
    page.getByTestId("breadcrumb-item").filter({ hasText: "Users" }),
  ).toBeVisible();
  await expect(page.getByText("Auto-assigned groups")).toBeVisible();
}

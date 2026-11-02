import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix } from "../helpers/api";

let dnsGroups: string[] = [];

test.describe.serial("DNS - Settings @dns", () => {
  test("Should add groups to DNS disabled management", async ({ dashboardAsOwner: page }) => {
    // Clean up stale groups from previous failed runs
    await deleteGroupsByPrefix(page, "dns-group-");

    await navigateTo(page, "/dns/settings");

    const name1 = generateRandomName("dns-group-");
    const name2 = generateRandomName("dns-group-");
    dnsGroups = [name1, name2];

    await expect(page.getByTestId("dns-groups-selector")).toBeVisible({ timeout: 15_000 });

    // Remove any existing group badges before adding new ones
    const existingBadges = page.getByTestId("group-badge");
    const badgeCount = await existingBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await existingBadges.first().click();
    }
    if (badgeCount > 0) {
      await page.getByTestId("save-changes").click();
      await expect(page.getByText("successfully").first()).toBeVisible();
    }

    for (const group of dnsGroups) {
      // Ensure dropdown is closed before reopening
      const search = page.getByTestId("dns-groups-selector-search");
      if (await search.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
        await expect(search).not.toBeVisible({ timeout: 3_000 });
      }
      await page.getByTestId("dns-groups-selector-open-close").click({ force: true });
      await expect(search).toBeVisible({ timeout: 5_000 });
      await search.fill(group);
      await search.press("Enter");
      // Wait for the group badge to appear before continuing
      await expect(page.getByText(group).first()).toBeVisible({ timeout: 5_000 });
    }
    // Close the dropdown if still open
    await page.keyboard.press("Escape");

    for (const group of dnsGroups) {
      await expect(page.getByText(group).first()).toBeVisible();
    }

    const saveResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/dns/settings") && resp.request().method() === "PUT",
      { timeout: 10_000 },
    );
    await page.getByTestId("save-changes").click();
    await saveResponse;
    await expect(page.getByText("successfully").first()).toBeVisible();
  });

  test("Should persist groups after reload and then remove them", async ({
    dashboardAsOwner: page,
  }) => {
    await page.reload();
    await expect(page.getByTestId("dns-groups-selector")).toBeVisible({ timeout: 15_000 });
    for (const group of dnsGroups) {
      await expect(page.getByText(group).first()).toBeVisible({ timeout: 10_000 });
    }

    // Remove groups
    for (const group of dnsGroups) {
      await page.getByTestId("group-badge").filter({ hasText: group }).click();
    }
    await page.getByTestId("save-changes").click();

    // Verify removed after reload
    await page.reload();
    for (const group of dnsGroups) {
      await expect(page.getByTestId("group-badge").filter({ hasText: group })).toHaveCount(0);
    }
  });

  test("Should delete the created groups", async ({ dashboardAsOwner: page }) => {
    for (const group of dnsGroups) {
      await deleteGroupsByPrefix(page, group);
    }
  });
});

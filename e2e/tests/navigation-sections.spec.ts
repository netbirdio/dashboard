import { expect, type Page } from "@playwright/test";
import { navigateTo } from "../helpers/auth";
import { test } from "../helpers/fixtures";

/**
 * The sidebar is one list for both products: Control Center and Peers at
 * the top, a collapsible section per product (Networking, Agent Network)
 * and the account area at the bottom. Open and closed sections are kept in
 * localStorage per user; the section of the current page opens on its own.
 * Agent Network depends on the deployment, so these tests stick to
 * Networking and the account area, which an owner always sees.
 */

const STORAGE_KEY = "netbird-nav-sections";

const section = (page: Page, label: string) =>
  page.getByTestId("left-navigation-section").filter({ hasText: label });

const navItem = (page: Page, label: string) =>
  page.getByTestId("left-navigation-item").getByText(label, { exact: true });

// The owner page is shared per worker, so a closed section must not leak
// into the next spec's sidebar navigation.
async function resetSections(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

test.describe.serial("Navigation sections @navigation", () => {
  test.afterEach(async ({ dashboardAsOwner: page }) => {
    await resetSections(page);
  });

  test("shows the shared pages, the Networking section and the account area", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/peers");
    await expect(navItem(page, "Control Center")).toBeVisible();
    await expect(navItem(page, "Peers")).toBeVisible();
    await expect(section(page, "Networking")).toBeVisible();
    await expect(section(page, "Account")).toBeVisible();
    await expect(navItem(page, "Traffic Events")).toBeVisible();
    await expect(navItem(page, "Audit Events")).toBeVisible();
    // Activity is gone: Traffic Events moved to Networking, Audit Events to
    // the account area.
    await expect(navItem(page, "Activity")).toHaveCount(0);
  });

  test("remembers a closed section across reloads", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/peers");
    await section(page, "Networking").click();
    await expect(navItem(page, "Traffic Events")).toHaveCount(0);

    await page.reload();
    await expect(navItem(page, "Peers")).toBeVisible();
    await expect(navItem(page, "Traffic Events")).toHaveCount(0);

    await section(page, "Networking").click();
    await expect(navItem(page, "Traffic Events")).toBeVisible();
  });

  test("opens and highlights the section of the current page", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/peers");
    await section(page, "Networking").click();
    await expect(navItem(page, "Traffic Events")).toHaveCount(0);
    await expect(section(page, "Networking")).toHaveAttribute(
      "data-active",
      "false",
    );

    await navigateTo(page, "/events/traffic");
    await expect(navItem(page, "Traffic Events")).toBeVisible();
    await expect(section(page, "Networking")).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  test("lists Groups in Networking and the account area, one page", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/groups");
    // Access Control › Groups and Team › Groups, both open on /groups.
    await expect(navItem(page, "Groups")).toHaveCount(2);
    await expect(section(page, "Networking")).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(section(page, "Account")).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});

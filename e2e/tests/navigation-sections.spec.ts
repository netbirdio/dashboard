import { type Browser, expect, type Page } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";
import { test } from "../helpers/fixtures";

/**
 * The sidebar is one list for both products: Control Center, Peers, Users
 * and Groups at the top, a collapsible section per product (Networking,
 * Agent Network) and the account area at the bottom. Open and closed
 * sections are kept in localStorage per user; the section of the current
 * page opens on its own.
 * Agent Network depends on the deployment, so these tests stick to
 * Networking and the account area, which an owner always sees.
 */

const STORAGE_KEY = "netbird-nav-sections";

const section = (page: Page, label: string) =>
  page.getByTestId("left-navigation-section").filter({ hasText: label });

const navItem = (page: Page, label: string) =>
  page.getByTestId("left-navigation-item").getByText(label, { exact: true });

// The second test user's role and state are changed by other specs while
// the suite runs, so the user role is simulated instead: an owner session
// whose current-user response carries the user role's permissions (the
// limited view, Peers only). The sidebar reads nothing else to decide.
async function openAsUserRole(browser: Browser) {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  const page = await context.newPage();
  await page.route("**/api/users/current*", async (route) => {
    const response = await route.fetch();
    const user = await response.json();
    const modules = Object.fromEntries(
      Object.keys(user?.permissions?.modules ?? {}).map((module) => [
        module,
        {
          create: false,
          read: module === "peers",
          update: false,
          delete: false,
        },
      ]),
    );
    return route.fulfill({
      response,
      json: {
        ...user,
        role: "user",
        permissions: { is_restricted: true, modules },
      },
    });
  });
  await loginToApp(page, "owner");
  return { page, close: () => context.close() };
}

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
    for (const label of ["Control Center", "Peers", "Users", "Groups"]) {
      await expect(navItem(page, label)).toBeVisible();
    }
    // Service Users is a tab on the Users page, and Documentation is in the
    // header's help menu.
    await expect(navItem(page, "Service Users")).toHaveCount(0);
    await expect(navItem(page, "Documentation")).toHaveCount(0);
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

  test("keeps Groups at the top, with one entry and no section highlighted", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/groups");
    await expect(navItem(page, "Groups")).toHaveCount(1);
    await expect(section(page, "Networking")).toHaveAttribute(
      "data-active",
      "false",
    );
    await expect(section(page, "Account")).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  test("reaches Service Users through the Users tabs, with Users active", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/team/users");
    await page.getByTestId("users-tab-service-users").click();
    await page.waitForURL(/\/team\/service-users/);
    await expect(
      page
        .getByTestId("left-navigation-item")
        .filter({ has: page.getByText("Users", { exact: true }) })
        .locator("[data-active]"),
    ).toHaveAttribute("data-active", "true");

    await page.getByTestId("users-tab-users").click();
    await page.waitForURL(/\/team\/users/);
  });

  test("shows the user role no empty section headings", async ({ browser }) => {
    const { page, close } = await openAsUserRole(browser);
    try {
      await navigateTo(page, "/peers");
      await expect(navItem(page, "Peers")).toBeVisible();
      // The user role can open no Networking or account page, so neither
      // section is there, not even as a heading.
      await expect(section(page, "Networking")).toHaveCount(0);
      await expect(section(page, "Account")).toHaveCount(0);
      // Any section that does show has at least one entry.
      const sections = page.locator("[data-navigation] [data-nav-section]");
      for (const group of await sections.all()) {
        if (!(await group.isVisible())) continue;
        await expect(
          group.getByTestId("left-navigation-item").first(),
        ).toBeVisible();
      }
    } finally {
      await close();
    }
  });
});

/**
 * Custom Playwright fixtures that provide pre-authenticated pages.
 *
 * Usage:
 *   import { test, expect } from "../helpers/fixtures";
 *   test.describe.serial("My Feature", () => {
 *     test("first test", async ({ dashboardAsOwner }) => { ... });
 *   });
 *
 * `dashboardAsOwner` logs in once (via OIDC redirect) and reuses the same
 * browser page for every test in the worker — no per-test login overhead.
 */
import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { loginToApp, type TestUser } from "./auth";

type Fixtures = {
  dashboardAsOwner: Page;
  dashboardAsUser: Page;
};

export const test = base.extend<{}, Fixtures>({
  dashboardAsOwner: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        storageState: "e2e/fixtures/auth/owner.json",
      });
      const page = await context.newPage();
      await loginToApp(page, "owner");
      await use(page);
      await context.close();
    },
    { scope: "worker" },
  ],

  dashboardAsUser: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        storageState: "e2e/fixtures/auth/user.json",
      });
      const page = await context.newPage();
      await loginToApp(page, "user");
      await use(page);
      await context.close();
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";

/**
 * Product navigation spec.
 *
 * The dashboard has two products, Networking and Agent Network, each with its
 * own sidebar and a header switch between them (src/modules/agent-network/
 * product.ts). A page both products show (Control Center, Peers, the account
 * area) has one URL and names its product in it, `?product=agent-network`, so
 * the product survives a reload, a new tab and a copied link. Without the
 * parameter a shared page opens in the user's last product, kept per user in
 * localStorage, and the URL is rewritten to name it.
 *
 * The switch needs Agent Network enabled, so the test build's
 * NETBIRD_AGENT_NETWORK_ENABLED override is set (see agent-network-focused-
 * view.spec.ts for the same hook).
 */
import { type Browser, expect, type Page, test } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";

async function openWithBothProducts(browser: Browser) {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch (e) {}
    },
    [AGENT_NETWORK_CONFIG_KEY, "enabled"],
  );
  const page = await context.newPage();
  await loginToApp(page, "owner");
  return { context, page, close: () => context.close() };
}

const productSwitch = (page: Page) => page.getByTestId("product-switcher");
const navItem = (page: Page, text: string) =>
  page.getByTestId("left-navigation-item").getByText(text, { exact: true });
const crumbRoot = (page: Page) =>
  page.getByTestId("breadcrumb-item").first();

async function expectProduct(page: Page, name: string) {
  await expect(productSwitch(page)).toContainText(name);
}

test.describe.serial("Product navigation @agent-network @test-build", () => {
  test("Peers opened from Agent Network stays there across a reload and a new tab", async ({
    browser,
  }) => {
    const { context, page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/agent-network/providers");
      await expectProduct(page, "Agent Network");
      await navItem(page, "Peers").click();

      await expect(page).toHaveURL(/\/peers\?product=agent-network$/);
      await expectProduct(page, "Agent Network");
      await expect(crumbRoot(page)).toHaveText("Agent Network");
      // The Agent Network sidebar, not the Networking one.
      await expect(navItem(page, "Agents")).toBeVisible();
      await expect(navItem(page, "Access Control")).toHaveCount(0);

      await page.reload();
      await expectProduct(page, "Agent Network");

      const tab = await context.newPage();
      await navigateTo(tab, "/peers?product=agent-network");
      await expectProduct(tab, "Agent Network");
      await expect(crumbRoot(tab)).toHaveText("Agent Network");
    } finally {
      await close();
    }
  });

  test("a copied link opens in its own product, not the user's last one", async ({
    browser,
  }) => {
    const { page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/dns/zones");
      await expectProduct(page, "Networking");

      await navigateTo(page, "/team/users?product=agent-network");
      await expectProduct(page, "Agent Network");
      await expect(crumbRoot(page)).toHaveText("Agent Network");
    } finally {
      await close();
    }
  });

  test("a shared page without a product opens in the last one and names it", async ({
    browser,
  }) => {
    const { page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/agent-network/providers");
      await expectProduct(page, "Agent Network");

      // An old bookmark or a docs link to a shared page.
      await navigateTo(page, "/groups");
      await expect(page).toHaveURL(/\/groups\?product=agent-network$/);
      await expectProduct(page, "Agent Network");
    } finally {
      await close();
    }
  });

  test("the switch lands on the other product's home", async ({ browser }) => {
    const { page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/peers?product=networking");
      await expectProduct(page, "Networking");

      await productSwitch(page).click();
      await page.getByRole("menuitem", { name: /Agent Network/ }).click();
      await expect(page).toHaveURL(/\/agent-network\/(providers|connect)$/);
      await expectProduct(page, "Agent Network");

      await productSwitch(page).click();
      await page.getByRole("menuitem", { name: /Networking/ }).click();
      await expect(page).toHaveURL(/\/peers\?product=networking$/);
      await expectProduct(page, "Networking");
    } finally {
      await close();
    }
  });

  test("the pages of one product keep a single URL", async ({ browser }) => {
    const { page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/agent-network/usage?product=networking");
      await expect(page).toHaveURL(/\/agent-network\/usage$/);
      await expectProduct(page, "Agent Network");
    } finally {
      await close();
    }
  });

  test("Groups sit under Team and agent policies are Agent Policies", async ({
    browser,
  }) => {
    const { page, close } = await openWithBothProducts(browser);
    try {
      await navigateTo(page, "/peers?product=networking");
      await navItem(page, "Access Control").click();
      await expect(navItem(page, "Posture Checks")).toBeVisible();
      await navItem(page, "Team").click();
      await navItem(page, "Groups").click();
      await expect(page).toHaveURL(/\/groups\?product=networking$/);

      await navigateTo(page, "/agent-network/providers");
      await expect(navItem(page, "Agent Policies")).toBeVisible();
      await expect(navItem(page, "Policies")).toHaveCount(0);
    } finally {
      await close();
    }
  });
});

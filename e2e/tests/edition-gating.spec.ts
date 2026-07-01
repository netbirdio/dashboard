/**
 * Temporary spec validating edition gating (cloud / licensed / oss).
 *
 * The test build hard-codes APP_ENV=test, so isNetBirdCloud() normally returns
 * true. This spec uses the test-only `netbird-test-edition` localStorage
 * override (see testEditionOverride in src/utils/netbird.ts) to drive each
 * edition against the OSS test management backend, which does not report the
 * premium permission modules (edr, idp, event_streaming). That absence is what
 * triggered the original `permission.event_streaming.read` crash and is now
 * covered by withDefaultModules in PermissionsProvider.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";

type Edition = "cloud" | "licensed" | "oss";

// Premium permission modules the open-source management server does not report.
const PREMIUM_MODULES = [
  "edr",
  "idp",
  "event_streaming",
  "assistant",
  "msp",
  "tenants",
  "billing",
  "proxy",
  "proxy_configuration",
];

// stripPremiumModules rewrites /users/current to drop the premium permission
// modules, reproducing an open-source management backend regardless of what the
// test management returns. This is the exact condition that crashed before the
// withDefaultModules default in PermissionsProvider.
async function stripPremiumModules(page: Page) {
  await page.route("**/users/current", async (route) => {
    const response = await route.fetch();
    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      return route.fulfill({ response });
    }
    if (body?.permissions?.modules) {
      PREMIUM_MODULES.forEach((m) => delete body.permissions.modules[m]);
    }
    return route.fulfill({ response, json: body });
  });
}

async function openAs(
  browser: Browser,
  edition: Edition,
  opts: { stripModules?: boolean } = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript((ed) => {
    try {
      window.localStorage.setItem("netbird-test-edition", ed as string);
    } catch (e) {}
  }, edition);
  const page = await context.newPage();
  if (opts.stripModules) await stripPremiumModules(page);
  await loginToApp(page, "owner");
  return { page, close: () => context.close() };
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

const SELF_HOSTED_CTA = "self-hosted-upgrade-cta";
const START_TRIAL = "Start 14-Day Free Trial";

test.describe.serial("Edition gating @edition", () => {
  test("integrations renders when premium permission modules are absent", async ({
    browser,
  }) => {
    // Reproduces the original crash: OSS management omits event_streaming/edr/
    // idp permission modules, and the integrations children read them directly.
    const { page, close } = await openAs(browser, "oss", {
      stripModules: true,
    });
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/integrations");

      await expect(
        page.getByText("Identity Provider Sync").first(),
      ).toBeVisible();
      await expect(page.getByText("MDM & EDR").first()).toBeVisible();

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  test("integrations renders without crashing on oss (teaser + upsell)", async ({
    browser,
  }) => {
    const { page, close } = await openAs(browser, "oss");
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/integrations");

      // Tabs render (the crash happened while rendering these children).
      await expect(
        page.getByText("Identity Provider Sync").first(),
      ).toBeVisible();
      await expect(page.getByText("MDM & EDR").first()).toBeVisible();

      // Self-hosted upsell CTA is present.
      await expect(page.getByTestId(SELF_HOSTED_CTA).first()).toBeVisible();

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  test("integrations renders unlocked on licensed (no upsell)", async ({
    browser,
  }) => {
    const { page, close } = await openAs(browser, "licensed");
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/integrations");

      await expect(
        page.getByText("Identity Provider Sync").first(),
      ).toBeVisible();

      // Licensed self-hosted unlocks features: no upsell CTA.
      await expect(page.getByTestId(SELF_HOSTED_CTA)).toHaveCount(0);

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  test("traffic events is locked with cloud upgrade CTA on cloud free", async ({
    browser,
  }) => {
    const { page, close } = await openAs(browser, "cloud");
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/events/traffic");

      // Cloud free plan locks the feature with a trial/upgrade CTA, not the
      // self-hosted license CTA.
      await expect(page.getByText(START_TRIAL).first()).toBeVisible();
      await expect(page.getByTestId(SELF_HOSTED_CTA)).toHaveCount(0);

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  test("traffic events is locked with self-hosted CTA on oss", async ({
    browser,
  }) => {
    const { page, close } = await openAs(browser, "oss");
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/events/traffic");

      await expect(page.getByTestId(SELF_HOSTED_CTA).first()).toBeVisible();
      await expect(page.getByText(START_TRIAL)).toHaveCount(0);

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  test("traffic events is unlocked on licensed (no upsell)", async ({
    browser,
  }) => {
    const { page, close } = await openAs(browser, "licensed");
    const errors = collectPageErrors(page);
    try {
      await navigateTo(page, "/events/traffic");

      await expect(page.getByTestId(SELF_HOSTED_CTA)).toHaveCount(0);
      await expect(page.getByText(START_TRIAL)).toHaveCount(0);

      expect(
        errors,
        `unexpected runtime errors: ${errors.join(" | ")}`,
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });
});

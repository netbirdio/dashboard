/**
 * Validates that the dashboard surfaces the management API's request id in the
 * error toast. Newer management servers set an `X-Request-Id` response header
 * (see telemetry.RequestIDHeader). When present, the dashboard shows it in the
 * error notification so it can be quoted in support tickets. Older servers omit
 * the header, and the toast must render without a request id.
 *
 * Each scenario runs in its own browser context so the mocked `/networks`
 * route and its resulting toast never bleed into another test through the
 * worker-scoped page.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";
import * as path from "path";

const SCREENSHOTS_DIR = path.resolve(__dirname, "..", "screenshots");
const REQUEST_ID = "9m4e2mr0ui3e8a215n4g";
const NETWORKS_ENDPOINT = /\/api\/networks(\?|$)/;
const REQUEST_ID_TESTID = "notification-request-id";
const TITLE_TESTID = "notification-title";

// failNetworks mocks the networks list GET with a 500, optionally attaching the
// X-Request-Id header to emulate a newer management server. The dashboard talks
// to the management API cross-origin, so the mock must mirror a CORS-enabled
// server: the browser only lets JS read a non-safelisted response header when it
// is listed in Access-Control-Expose-Headers. This is the same requirement the
// real management server must satisfy for the feature to work in production.
async function failNetworks(page: Page, opts: { withRequestId: boolean }) {
  await page.route(NETWORKS_ENDPOINT, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const origin = route.request().headers()["origin"] || "*";
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "access-control-allow-origin": origin,
      "access-control-expose-headers": "X-Request-Id",
    };
    if (opts.withRequestId) headers["X-Request-Id"] = REQUEST_ID;
    await route.fulfill({
      status: 500,
      headers,
      body: JSON.stringify({ code: 500, message: "internal server error" }),
    });
  });
}

async function openOwner(
  browser: Browser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

test.describe.serial("API error request id @error-handling", () => {
  test("shows the X-Request-Id from a failed request in the error toast", async ({
    browser,
  }) => {
    const { page, close } = await openOwner(browser);
    try {
      await failNetworks(page, { withRequestId: true });
      await loginToApp(page, "owner");
      await navigateTo(page, "/networks");

      const requestIdLine = page.getByTestId(REQUEST_ID_TESTID);
      await expect(requestIdLine).toBeVisible();
      await expect(requestIdLine).toContainText(REQUEST_ID);
      await expect(page.getByTestId(TITLE_TESTID).first()).toContainText(
        "Request failed with status code 500",
      );

      const toast = page.locator("[data-toast-notification]").first();
      await toast.screenshot({
        path: path.join(SCREENSHOTS_DIR, "error-toast-with-request-id.png"),
      });
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, "networks-page-error-request-id.png"),
      });
    } finally {
      await close();
    }
  });

  test("omits the request id when the server does not send the header", async ({
    browser,
  }) => {
    const { page, close } = await openOwner(browser);
    try {
      await failNetworks(page, { withRequestId: false });
      await loginToApp(page, "owner");
      await navigateTo(page, "/networks");

      // The generic error toast still appears for older servers...
      await expect(page.getByTestId(TITLE_TESTID).first()).toContainText(
        "Request failed with status code 500",
      );
      // ...but no request id line is rendered.
      await expect(page.getByTestId(REQUEST_ID_TESTID)).toHaveCount(0);

      const toast = page.locator("[data-toast-notification]").first();
      await toast.screenshot({
        path: path.join(SCREENSHOTS_DIR, "error-toast-without-request-id.png"),
      });
    } finally {
      await close();
    }
  });
});

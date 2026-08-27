/**
 * Agent Network settings wire-shape spec.
 *
 * The management API signals "account not bootstrapped" differently by
 * generation: current servers answer GET /agent-network/settings with the
 * defaults object carrying an empty endpoint/proxy_address, older ones with
 * 200 + a JSON null body, and the oldest with a 404.
 * useAgentNetworkSettings normalizes all three to the same null-settings
 * signal, and this spec pins that: the providers page must render the
 * connect-first endpoint placeholder for every unbootstrapped shape, and the
 * endpoint badge once the account is bootstrapped. The settings route is
 * mocked per test, so the assertions do not depend on the backend build or
 * on account state left behind by other suites.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp } from "../helpers/auth";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";

const EMPTY_STATE_TEXT =
  "Connect your first provider to set up your agent network endpoint.";

const BOOTSTRAPPED_ENDPOINT = "violet.eu.proxy.netbird.io";

// The defaults object current servers return for an account that has not been
// bootstrapped yet: the mutable settings carry their default values, the
// endpoint/proxy_address identity is empty, and there are no timestamps because
// no row has been persisted.
const UNBOOTSTRAPPED_DEFAULTS = {
  endpoint: "",
  proxy_address: "",
  dedicated: false,
  enable_log_collection: true,
  enable_prompt_collection: false,
  redact_pii: false,
  access_log_retention_days: 30,
};

const BOOTSTRAPPED_SETTINGS = {
  endpoint: BOOTSTRAPPED_ENDPOINT,
  proxy_address: "eu.proxy.netbird.io",
  dedicated: false,
  enable_log_collection: true,
  enable_prompt_collection: false,
  redact_pii: false,
  access_log_retention_days: 30,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function mockSettingsResponse(
  page: Page,
  response: { status: number; body: string },
) {
  await page.route("**/api/agent-network/settings", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: response.body,
    });
  });
}

async function openProvidersPage(
  browser: Browser,
  settingsResponse: { status: number; body: string },
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  // Close the context on any setup failure — the caller only receives the
  // close callback once setup succeeds.
  try {
    await context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key as string, value as string);
        } catch (e) {}
      },
      [AGENT_NETWORK_CONFIG_KEY, "enabled"],
    );
    const page = await context.newPage();
    await mockSettingsResponse(page, settingsResponse);
    await loginToApp(page, "owner");
    await page.goto("/agent-network/providers");
    await page.keyboard.press("Escape");
    return { page, close: () => context.close() };
  } catch (e) {
    await context.close();
    throw e;
  }
}

const UNBOOTSTRAPPED_SHAPES: {
  name: string;
  response: { status: number; body: string };
}[] = [
  {
    name: "defaults object with empty endpoint (current servers)",
    response: { status: 200, body: JSON.stringify(UNBOOTSTRAPPED_DEFAULTS) },
  },
  {
    name: "200 with JSON null body (older servers)",
    response: { status: 200, body: "null" },
  },
  {
    name: "404 (oldest servers)",
    response: {
      status: 404,
      body: JSON.stringify({ message: "settings not found", code: 404 }),
    },
  },
];

test.describe("Agent Network settings wire shapes @agent-network", () => {
  for (const shape of UNBOOTSTRAPPED_SHAPES) {
    test(`unbootstrapped account renders the empty state: ${shape.name}`, async ({
      browser,
    }) => {
      const { page, close } = await openProvidersPage(browser, shape.response);
      try {
        await expect(page.getByText(EMPTY_STATE_TEXT)).toBeVisible();
        await expect(page.getByText(BOOTSTRAPPED_ENDPOINT)).toHaveCount(0);
      } finally {
        await close();
      }
    });
  }

  test("bootstrapped account renders the endpoint instead of the empty state", async ({
    browser,
  }) => {
    const { page, close } = await openProvidersPage(browser, {
      status: 200,
      body: JSON.stringify(BOOTSTRAPPED_SETTINGS),
    });
    try {
      await expect(page.getByText(BOOTSTRAPPED_ENDPOINT)).toBeVisible();
      await expect(page.getByText(EMPTY_STATE_TEXT)).toHaveCount(0);
    } finally {
      await close();
    }
  });
});

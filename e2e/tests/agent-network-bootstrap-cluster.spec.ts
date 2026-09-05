/**
 * Agent Network bootstrap-cluster spec.
 *
 * The account's agent network endpoint is assigned once, from the proxy
 * cluster the connect-provider wizard pins it to, and it is immutable after
 * that. Not every live cluster can host it: the endpoint is a private service,
 * reachable only from connected peers and authorised by their tunnel identity,
 * which only a cluster with a connected embedded proxy (`netbird proxy`) can
 * serve. Management reports that per cluster as supports_private and refuses a
 * bootstrap onto a cluster without it.
 *
 * This spec pins the wizard's half of that contract: it picks a
 * private-capable cluster even when a centralised one is listed first, and it
 * blocks setup — with a message naming what is missing — when no listed
 * cluster qualifies. Both the settings and domains routes are mocked, so the
 * assertions do not depend on which clusters the test backend happens to have
 * connected, and no provider is created against it.
 */
import { type Browser, expect, type Page, test } from "@playwright/test";
import { loginToApp } from "../helpers/auth";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";

// Listed first, and unusable: a centralised proxy cluster. Picking it is the
// bug this spec guards against.
const CENTRAL_CLUSTER = "central.proxy.netbird.io";
// Listed second, and the only valid pick.
const EMBEDDED_CLUSTER = "embedded.proxy.netbird.io";

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
  ...UNBOOTSTRAPPED_DEFAULTS,
  endpoint: `violet.${EMBEDDED_CLUSTER}`,
  proxy_address: EMBEDDED_CLUSTER,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/** A free (cluster-backed) domain as /reverse-proxies/domains reports it. */
function freeDomain(name: string, supportsPrivate: boolean) {
  return {
    id: name,
    domain: name,
    validated: true,
    type: "free",
    supports_private: supportsPrivate,
    supports_custom_ports: true,
    require_subdomain: true,
  };
}

async function json(route: import("@playwright/test").Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Opens the providers page for an account that has not been bootstrapped,
 * with the given clusters on the domains endpoint. Returns the page plus a
 * promise-friendly getter for the bootstrap POST body, which is captured and
 * answered locally so the real backend is never mutated.
 */
async function openWizard(
  browser: Browser,
  domains: ReturnType<typeof freeDomain>[],
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
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

    await page.route("**/api/agent-network/settings", (route) => {
      const method = route.request().method();
      if (method === "GET") return json(route, UNBOOTSTRAPPED_DEFAULTS);
      if (method === "POST") return json(route, BOOTSTRAPPED_SETTINGS);
      return route.continue();
    });
    await page.route("**/api/reverse-proxies/domains", (route) =>
      route.request().method() === "GET"
        ? json(route, domains)
        : route.continue(),
    );
    // Keep the create hermetic: the wizard only reaches this once the
    // bootstrap it does first has succeeded.
    await page.route("**/api/agent-network/providers", (route) =>
      route.request().method() === "POST"
        ? json(route, { id: "prov-e2e", name: "e2e-provider" })
        : route.continue(),
    );

    await loginToApp(page, "owner");
    await page.goto("/agent-network/providers");
    await page.keyboard.press("Escape");
    return { page, close: () => context.close() };
  } catch (e) {
    await context.close();
    throw e;
  }
}

/** Fills the provider tab with the minimum a create needs. */
async function fillProviderTab(page: Page) {
  await page.getByPlaceholder("https://api.openai.com").fill("https://api.openai.com");
  await page.getByPlaceholder("sk-...").first().fill("sk-e2e-bootstrap-key");
}

test.describe("Agent Network bootstrap cluster @agent-network", () => {
  test("bootstraps onto a private-capable cluster, skipping a centralised one listed first", async ({
    browser,
  }) => {
    const { page, close } = await openWizard(browser, [
      freeDomain(CENTRAL_CLUSTER, false),
      freeDomain(EMBEDDED_CLUSTER, true),
    ]);
    try {
      await page
        .getByRole("button", { name: "Connect Provider" })
        .first()
        .click({ force: true });

      // The unusable cluster is listed, but it is not a blocker: a usable one
      // exists, so the wizard proceeds without the warning.
      await expect(
        page.getByTestId("agent-network-no-cluster-callout"),
      ).toHaveCount(0);

      await fillProviderTab(page);

      const bootstrap = page.waitForResponse(
        (resp) =>
          resp.url().includes("/agent-network/settings") &&
          resp.request().method() === "POST",
        { timeout: 30_000 },
      );

      await page.getByRole("button", { name: "Continue" }).click({ force: true });
      await page
        .getByRole("button", { name: "Connect Provider" })
        .last()
        .click({ force: true });

      const payload = (await bootstrap).request().postDataJSON();
      expect(payload.proxy_address).toBe(EMBEDDED_CLUSTER);
    } finally {
      await close();
    }
  });

  test("blocks setup when no listed cluster has an embedded proxy", async ({
    browser,
  }) => {
    const { page, close } = await openWizard(browser, [
      freeDomain(CENTRAL_CLUSTER, false),
    ]);
    try {
      await page
        .getByRole("button", { name: "Connect Provider" })
        .first()
        .click({ force: true });

      const callout = page.getByTestId("agent-network-no-cluster-callout");
      await expect(callout).toBeVisible({ timeout: 10_000 });
      await expect(callout).toContainText("embedded proxy");

      // With nothing to pin to there is no bootstrap to make, so the wizard
      // cannot advance — rather than sending a request management refuses.
      await fillProviderTab(page);
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeDisabled();
    } finally {
      await close();
    }
  });
});

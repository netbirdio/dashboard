/**
 * Agent Network focused-view spec.
 *
 * Exercises the account-driven focused view added for netbird.ai signups:
 * the `agent_network_only` account setting hides the rest of the dashboard,
 * an explicit `false` opts back out, and a pending netbird.ai signup applies
 * the focused view optimistically and persists the setting via PUT /accounts.
 *
 * The test management backend does not know the setting, so GET /accounts is
 * rewritten per-test to inject it (same interception approach as
 * edition-gating.spec.ts). "only" mode is asserted through the Networks nav
 * item, which toggles purely on the focused-view flag and does not depend on
 * premium permission modules.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp, navigateTo } from "../helpers/auth";

const SIGNUP_SOURCE_KEY = "netbird-signup-source";
const AGENT_NETWORK_SOURCE = "netbird.ai";

type AccountMock = {
  // undefined leaves the setting absent (as an un-onboarded account would be).
  agentNetworkOnly?: boolean;
  signupFormPending?: boolean;
  // dashboardFeaturesAgentNetwork sets settings.dashboard_features.agent_network,
  // which makes the Agent Network menu available without focusing the dashboard.
  dashboardFeaturesAgentNetwork?: boolean;
};

// mockAccounts rewrites GET /accounts to inject the focused-view setting and
// onboarding state onto the real account. A PUT to /accounts/{id} is captured
// and flips the injected setting to true, mirroring the server persisting the
// value so the optimistic view does not revert once the write settles.
function mockAccounts(
  page: Page,
  initial: AccountMock,
  captured: { putBody?: any },
) {
  let applied = initial.agentNetworkOnly;

  page.route("**/api/accounts", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      return route.fulfill({ response });
    }
    if (Array.isArray(body) && body[0]) {
      body[0].settings = { ...(body[0].settings ?? {}) };
      if (applied === undefined) {
        delete body[0].settings.agent_network_only;
      } else {
        body[0].settings.agent_network_only = applied;
      }
      if (initial.dashboardFeaturesAgentNetwork !== undefined) {
        body[0].settings.dashboard_features = {
          agent_network: initial.dashboardFeaturesAgentNetwork,
        };
      }
      body[0].onboarding = {
        ...(body[0].onboarding ?? {}),
        signup_form_pending: !!initial.signupFormPending,
      };
    }
    return route.fulfill({ response, json: body });
  });

  page.route("**/api/accounts/*", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    try {
      captured.putBody = route.request().postDataJSON();
    } catch (e) {
      captured.putBody = null;
    }
    applied = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ settings: { agent_network_only: true } }),
    });
  });
}

async function openWithAccount(
  browser: Browser,
  account: AccountMock,
  opts: { signupSource?: boolean } = {},
): Promise<{
  page: Page;
  captured: { putBody?: any };
  close: () => Promise<void>;
}> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  if (opts.signupSource) {
    await context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key as string, value as string);
        } catch (e) {}
      },
      [SIGNUP_SOURCE_KEY, AGENT_NETWORK_SOURCE],
    );
  }
  const page = await context.newPage();
  const captured: { putBody?: any } = {};
  mockAccounts(page, account, captured);
  await loginToApp(page, "owner");
  return { page, captured, close: () => context.close() };
}

function navItem(page: Page, text: string) {
  return page
    .getByTestId("left-navigation-item")
    .getByText(text, { exact: true });
}

// Regular dashboard sections that the focused view hides (gated on
// !agentNetworkOnly in Navigation.tsx).
const FOCUS_HIDDEN_NAV = ["Networks", "Reverse Proxy", "DNS", "Activity"];
// Agent Network view routes that make up the focused surface.
const AGENT_VIEW_PATHS = [
  "/agent-network/providers",
  "/agent-network/policies",
  "/agent-network/usage",
  "/agent-network/configuration",
];

test.describe.serial("Agent Network focused view @agent-network", () => {
  test("focused menu shows only Agent Network views and hides the regular sections", async ({
    browser,
  }) => {
    const { page, close } = await openWithAccount(browser, {
      agentNetworkOnly: true,
    });
    try {
      // Peers always renders for an owner and is not part of the focused
      // split, so it confirms the sidebar rendered before asserting absences.
      await expect(navItem(page, "Peers")).toBeVisible();

      // The Agent Network section is present and the regular sections are gone.
      await expect(navItem(page, "Agent Network")).toBeVisible();
      for (const label of FOCUS_HIDDEN_NAV) {
        await expect(navItem(page, label)).toHaveCount(0);
      }
    } finally {
      await close();
    }
  });

  test("focused view keeps every Agent Network route reachable", async ({
    browser,
  }) => {
    const { page, close } = await openWithAccount(browser, {
      agentNetworkOnly: true,
    });
    try {
      // Each Agent Network view renders instead of the route guard redirecting
      // away; the Agent Network section stays in the sidebar throughout.
      for (const path of AGENT_VIEW_PATHS) {
        await navigateTo(page, path);
        await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
        await expect(navItem(page, "Agent Network")).toBeVisible();
      }
    } finally {
      await close();
    }
  });

  test("explicit opt-out restores the regular menu and removes Agent Network", async ({
    browser,
  }) => {
    const { page, close } = await openWithAccount(browser, {
      agentNetworkOnly: false,
    });
    try {
      // The sidebar rendered (Peers is always present for an owner)...
      await expect(navItem(page, "Peers")).toBeVisible();
      // ...and the Agent Network section is gone: the explicit opt-out wins
      // and, without a deployment config flag, the section is not enabled.
      await expect(navItem(page, "Agent Network")).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test("dashboard_features.agent_network makes the menu available without focusing", async ({
    browser,
  }) => {
    const { page, close } = await openWithAccount(browser, {
      dashboardFeaturesAgentNetwork: true,
    });
    try {
      // The Agent Network menu is available...
      await expect(navItem(page, "Agent Network")).toBeVisible();
      // ...but the dashboard is not focused: a regular section that focused
      // mode hides (Reverse Proxy) is still present.
      await expect(navItem(page, "Reverse Proxy")).toBeVisible();
    } finally {
      await close();
    }
  });

  test("applies the focused view optimistically for a pending netbird.ai signup and persists it", async ({
    browser,
  }) => {
    const { page, captured, close } = await openWithAccount(
      browser,
      { agentNetworkOnly: undefined, signupFormPending: true },
      { signupSource: true },
    );
    try {
      // Focused view is applied immediately, before the setting is persisted.
      await expect(navItem(page, "Agent Network")).toBeVisible();
      await expect(navItem(page, "Networks")).toHaveCount(0);

      // The signup source is persisted: focused view plus the Agent Network
      // menu flag, so turning focus off later keeps access to Agent Network.
      await expect
        .poll(() => captured.putBody?.settings?.agent_network_only)
        .toBe(true);
      expect(
        captured.putBody?.settings?.dashboard_features?.agent_network,
      ).toBe(true);

      // The focused view is retained after the write settles.
      await expect(navItem(page, "Networks")).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test("existing netbird.ai account gets dashboard_features, not the focused view", async ({
    browser,
  }) => {
    // An existing account (signup form already submitted) with the netbird.ai
    // source should have the Agent Network menu made available via
    // dashboard_features, not the focused agent_network_only view.
    const { page, captured, close } = await openWithAccount(
      browser,
      { signupFormPending: false },
      { signupSource: true },
    );
    try {
      await expect
        .poll(
          () => captured.putBody?.settings?.dashboard_features?.agent_network,
        )
        .toBe(true);
      expect(captured.putBody?.settings?.agent_network_only).not.toBe(true);
    } finally {
      await close();
    }
  });

  test("exposes the focused-view toggle in client settings", async ({
    browser,
  }) => {
    const { page, close } = await openWithAccount(browser, {
      agentNetworkOnly: true,
    });
    try {
      await navigateTo(page, "/settings?tab=clients");
      await expect(page.getByTestId("agent-network-only")).toBeVisible();
    } finally {
      await close();
    }
  });
});

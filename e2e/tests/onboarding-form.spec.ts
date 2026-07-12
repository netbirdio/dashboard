/**
 * Onboarding form selection spec.
 *
 * Validates which onboarding form is shown first and which one persists,
 * across signup-source and account states — the recurring "regular form
 * flashes before the Agent Network form" bug. Onboarding is disabled in the
 * test build by default; each test opts in via the `netbird-test-onboarding`
 * localStorage flag (see testOnboardingEnabled in src/utils/netbird.ts), and
 * GET /accounts is rewritten to drive the account's onboarding + settings
 * state (same interception approach as edition-gating.spec.ts).
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp } from "../helpers/auth";

const SIGNUP_SOURCE_KEY = "netbird-signup-source";
const AGENT_NETWORK_SOURCE = "netbird.ai";

const AGENT_FORM = "agent-network-onboarding";
const REGULAR_FORM = "regular-onboarding";

type AccountState = {
  signupFormPending?: boolean;
  onboardingFlowPending?: boolean;
  agentNetworkOnly?: boolean;
};

// mockAccounts rewrites GET /accounts to drive the onboarding + focused-view
// state, optionally delaying the response to emulate a slow backend. A PUT to
// /accounts/{id} flips agent_network_only to true afterwards, mirroring the
// server persisting the netbird.ai signup mark.
function mockAccounts(page: Page, state: AccountState, delayMs: number) {
  let agentNetworkOnly = state.agentNetworkOnly;

  page.route("**/api/accounts", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const response = await route.fetch();
    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      return route.fulfill({ response });
    }
    if (Array.isArray(body) && body[0]) {
      body[0].onboarding = {
        ...(body[0].onboarding ?? {}),
        signup_form_pending: !!state.signupFormPending,
        onboarding_flow_pending: !!state.onboardingFlowPending,
      };
      body[0].settings = { ...(body[0].settings ?? {}) };
      if (agentNetworkOnly === undefined) {
        delete body[0].settings.agent_network_only;
      } else {
        body[0].settings.agent_network_only = agentNetworkOnly;
      }
    }
    return route.fulfill({ response, json: body });
  });

  page.route("**/api/accounts/*", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    agentNetworkOnly = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ settings: { agent_network_only: true } }),
    });
  });
}

async function openOnboarding(
  browser: Browser,
  opts: { source?: boolean; account: AccountState; delayMs?: number },
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript(
    ([sourceKey, sourceValue, withSource]) => {
      try {
        window.localStorage.setItem("netbird-test-onboarding", "true");
        if (withSource) {
          window.localStorage.setItem(
            sourceKey as string,
            sourceValue as string,
          );
        }
      } catch (e) {}
    },
    [SIGNUP_SOURCE_KEY, AGENT_NETWORK_SOURCE, !!opts.source] as const,
  );
  const page = await context.newPage();
  mockAccounts(page, opts.account, opts.delayMs ?? 0);
  await loginToApp(page, "owner", { expectOnboarding: true });
  return { page, close: () => context.close() };
}

test.describe.serial("Onboarding form selection @onboarding", () => {
  test("netbird.ai signup shows the Agent Network form and never the regular one", async ({
    browser,
  }) => {
    const { page, close } = await openOnboarding(browser, {
      source: true,
      account: { signupFormPending: true, onboardingFlowPending: true },
    });
    try {
      await expect(page.getByTestId(AGENT_FORM)).toBeVisible();
      await expect(page.getByTestId(REGULAR_FORM)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test("a plain new cloud account shows the regular onboarding form", async ({
    browser,
  }) => {
    const { page, close } = await openOnboarding(browser, {
      source: false,
      account: { signupFormPending: true, onboardingFlowPending: true },
    });
    try {
      await expect(page.getByTestId(REGULAR_FORM)).toBeVisible();
      await expect(page.getByTestId(AGENT_FORM)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test("an account already marked agent_network_only shows the Agent Network form", async ({
    browser,
  }) => {
    const { page, close } = await openOnboarding(browser, {
      source: false,
      account: { onboardingFlowPending: true, agentNetworkOnly: true },
    });
    try {
      await expect(page.getByTestId(AGENT_FORM)).toBeVisible();
      await expect(page.getByTestId(REGULAR_FORM)).toHaveCount(0);
    } finally {
      await close();
    }
  });

  test("a slow backend never flashes the regular form for a netbird.ai signup", async ({
    browser,
  }) => {
    const { page, close } = await openOnboarding(browser, {
      source: true,
      account: { signupFormPending: true, onboardingFlowPending: true },
      delayMs: 1500,
    });
    try {
      // While /accounts is still loading, no onboarding form should have been
      // committed to the wrong flow.
      await expect(page.getByTestId(REGULAR_FORM)).toHaveCount(0);
      // Once it resolves, the Agent Network form is the one that appears...
      await expect(page.getByTestId(AGENT_FORM)).toBeVisible();
      await expect(page.getByTestId(REGULAR_FORM)).toHaveCount(0);
      // ...and it persists after the setting is applied (no flip/close).
      await page.waitForTimeout(1500);
      await expect(page.getByTestId(AGENT_FORM)).toBeVisible();
      await expect(page.getByTestId(REGULAR_FORM)).toHaveCount(0);
    } finally {
      await close();
    }
  });
});

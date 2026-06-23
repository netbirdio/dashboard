/**
 * Login helper for Playwright tests.
 *
 * The OIDC library (@axa-fr/react-oidc) uses a service worker for token
 * management, so storageState alone can't restore a session. Each test
 * goes through the OIDC redirect flow. Zitadel session cookies from
 * storageState make re-auth fast (account selection, no credentials).
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { clearScrollLock } from "./utils";

export type TestUser = "owner" | "user";

const credentials: Record<TestUser, { username: string; password: string }> = {
  owner: { username: "owner@localhost.test", password: "testMe123@" },
  user: { username: "user@localhost.test", password: "testMe123@" },
};

/**
 * Navigate to the app, authenticate via Zitadel, and wait for the app to load.
 */
export async function loginToApp(page: Page, user: TestUser = "owner") {
  const { username, password } = credentials[user];

  await page.goto("/");

  // The app either loads directly or redirects to Zitadel.
  // Use locators that match either outcome — Playwright auto-waits.
  const appReady = page.getByTestId("left-navigation-item").first();
  const setupModal = page.getByTestId("setup-netbird-modal");
  const approvalPending = page.getByText("User Approval Pending");
  const onboarding = page.getByText("Add new device to your network");
  const selectAccount = page.getByText("Select account");
  const loginInput = page.locator("input[id=loginName]");
  const passwordInput = page.locator("input[id=password]");

  // Wait for any of these outcomes
  const which = await Promise.race([
    appReady.waitFor({ timeout: 20_000 }).then(() => "app" as const),
    setupModal.waitFor({ timeout: 20_000 }).then(() => "modal" as const),
    approvalPending.waitFor({ timeout: 20_000 }).then(() => "approval" as const),
    onboarding.waitFor({ timeout: 20_000 }).then(() => "onboarding" as const),
    selectAccount.waitFor({ timeout: 20_000 }).then(() => "select" as const),
    loginInput.waitFor({ timeout: 20_000 }).then(() => "login" as const),
    passwordInput.waitFor({ timeout: 20_000 }).then(() => "password" as const),
  ]);

  if (which === "app") {
    return;
  }

  if (which === "modal") {
    await setupModal.getByTestId("modal-close").click();
    await expect(setupModal).not.toBeVisible();
    return;
  }

  if (which === "approval" || which === "onboarding") {
    return;
  }

  // We're on Zitadel
  if (which === "select") {
    await page.getByText(username).click();
  } else if (which === "login") {
    await loginInput.fill(username);
    await page.locator("button[id=submit-button]").click();
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.fill(password);
    await page.locator("button[id=submit-button]").click();
  } else {
    // password form directly
    await passwordInput.fill(password);
    await page.locator("button[id=submit-button]").click();
  }

  // Handle 2FA skip if shown
  const skipButton = page.locator("button[name=skip]");
  if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipButton.click();
  }

  // Wait for either nav or modal to appear
  await Promise.race([
    appReady.waitFor({ timeout: 15_000 }),
    setupModal.waitFor({ timeout: 15_000 }),
    approvalPending.waitFor({ timeout: 15_000 }),
    onboarding.waitFor({ timeout: 15_000 }),
  ]);

  // Dismiss setup modal if present
  if (await setupModal.isVisible().catch(() => false)) {
    await setupModal.getByTestId("modal-close").click();
    await expect(setupModal).not.toBeVisible();
  }

  // Clear any stale Radix overlays
  await clearScrollLock(page);
}

/**
 * Navigate to a path within the app, dismissing the setup modal if it appears.
 * Use this instead of page.goto() for in-app navigation after loginToApp().
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const modal = page.getByTestId("setup-netbird-modal");
  try {
    await modal.waitFor({ state: "visible", timeout: 3_000 });
    await modal.getByTestId("modal-close").click();
    await expect(modal).not.toBeVisible();
  } catch {
    // No modal — fine
  }
  await clearScrollLock(page);
}

import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { deleteNotificationChannelsByType } from "../helpers/api";

test.describe.serial("Settings - Notifications - Webhook @notifications", () => {
  test("Should connect a webhook with no authentication", async ({ dashboardAsOwner: page }) => {
    await deleteNotificationChannelsByType(page, "webhook");
    await navigateTo(page, "/settings?tab=notifications");
    await expect(page.getByTestId("notification-channel-webhook")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("notification-channel-webhook").click();
    await expect(page.getByTestId("webhook-connect")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("webhook-connect").click();
    await page.getByTestId("webhook-url-input").fill("https://webhook.example/test");
    await expect(page.getByTestId("webhook-auth-type")).toContainText("No Authentication");
    await page.getByTestId("webhook-continue").click();
    await page.getByTestId("webhook-save").click();
    await expect(page.getByTestId("webhook-actions")).toBeVisible();
  });

  test("Should toggle a notification event", async ({ dashboardAsOwner: page }) => {
    const toggle = page.getByTestId("notification-event-peer.pending.approval");
    const initial = await toggle.getAttribute("data-state");
    const expected = initial === "checked" ? "unchecked" : "checked";

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", expected);

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", initial!);
  });

  test("Should edit webhook and cycle through auth types", async ({ dashboardAsOwner: page }) => {
    // Basic Auth
    await openWebhookEdit(page);
    await selectWebhookAuth(page, "Basic Auth");
    await page.getByTestId("webhook-basic-username").fill("admin");
    await page.getByTestId("webhook-basic-password").fill("password");
    await page.getByTestId("webhook-save").click();

    // Bearer Token
    await openWebhookEdit(page);
    await selectWebhookAuth(page, "Bearer Token");
    await page.getByTestId("webhook-bearer-token").fill("my-bearer-token");
    await page.getByTestId("webhook-save").click();

    // Custom Auth
    await openWebhookEdit(page);
    await selectWebhookAuth(page, "Custom Authentication");
    await page.getByTestId("webhook-custom-auth-name").fill("X-API-Key");
    await page.getByTestId("webhook-custom-auth-value").fill("secret-api-key");
    await page.getByTestId("webhook-save").click();
  });

  test("Should manage custom headers", async ({ dashboardAsOwner: page }) => {
    await page.reload();
    // Ensure webhook exists (previous test may have failed)
    if (await page.getByTestId("webhook-connect").isVisible().catch(() => false)) {
      await page.getByTestId("webhook-connect").click();
      await page.getByTestId("webhook-url-input").fill("https://webhook.example/test");
      await page.getByTestId("webhook-continue").click();
      await page.getByTestId("webhook-save").click();
      await expect(page.getByTestId("webhook-actions")).toBeVisible();
    }
    await openWebhookEdit(page);
    await page.getByTestId("webhook-tab-headers").click({ force: true });

    // Remove existing headers
    const removeButtons = page.getByTestId("webhook-header-remove");
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await page.getByTestId("webhook-header-remove").first().click({ force: true });
    }

    // Add new header
    await page.getByTestId("webhook-add-header").click({ force: true });
    await page.getByTestId("webhook-header-name").last().fill("X-Custom-Header");
    await page.getByTestId("webhook-header-value").last().fill("my-custom-value");
    await page.getByTestId("webhook-save").click();

    // Verify persistence
    await page.reload();
    await openWebhookEdit(page);
    await page.getByTestId("webhook-tab-headers").click({ force: true });
    // Verify the custom header exists (there may be auth headers with the same testid)
    const headerNames = page.getByTestId("webhook-header-name");
    const headerCount = await headerNames.count();
    let found = false;
    for (let i = 0; i < headerCount; i++) {
      if ((await headerNames.nth(i).inputValue()) === "X-Custom-Header") {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await page.getByRole("button", { name: "Cancel" }).click({ force: true });
  });

  test("Should delete the webhook", async ({ dashboardAsOwner: page }) => {
    await page.reload();
    await page.getByTestId("webhook-actions").click({ force: true });
    await page.getByTestId("webhook-delete").click({ force: true });
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await expect(page.getByTestId("webhook-connect")).toBeVisible();
  });
});

async function openWebhookEdit(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("webhook-actions")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("webhook-actions").click({ force: true });
  await expect(page.getByTestId("webhook-edit")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("webhook-edit").click({ force: true });
}

async function selectWebhookAuth(page: import("@playwright/test").Page, label: string) {
  await page.getByTestId("webhook-auth-type").click();
  await page.locator("[cmdk-list]").getByText(label).click();
}

async function ensureWebhookDisconnected(page: import("@playwright/test").Page) {
  await expect(
    page.getByTestId("webhook-connect").or(page.getByTestId("webhook-actions")),
  ).toBeVisible();
  if (await page.getByTestId("webhook-actions").isVisible().catch(() => false)) {
    await page.getByTestId("webhook-actions").click({ force: true });
    await page.getByTestId("webhook-delete").click({ force: true });
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await expect(page.getByTestId("webhook-connect")).toBeVisible();
  }
}

import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { deleteNotificationChannelsByType } from "../helpers/api";

const TEST_EMAIL = "notify@example.test";

test.describe.serial("Settings - Notifications - Email @notifications", () => {
  test("Should add an email recipient", async ({ dashboardAsOwner: page }) => {
    await deleteNotificationChannelsByType(page, "email");
    await navigateTo(page, "/settings?tab=notifications");
    await expect(page.getByTestId("notification-channel-email")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("notification-channel-email").click();
    await expect(page.getByTestId("notification-email-input")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("notification-email-input").fill(TEST_EMAIL);
    await page.getByTestId("notification-email-add").click();
    await expect(
      page.getByTestId("notification-email-recipient").filter({ hasText: TEST_EMAIL }),
    ).toBeVisible();
  });

  test("Should toggle email channel enabled and verify on overview", async ({
    dashboardAsOwner: page,
  }) => {
    const toggle = page.locator('[data-testid="notification-email-enabled"]');
    if ((await toggle.getAttribute("data-state")) !== "checked") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("data-state", "checked");

    await backToOverview(page);
    await expect(page.getByTestId("notification-channel-email")).toContainText("Enabled");

    await page.getByTestId("notification-channel-email").click();
    await page.locator('[data-testid="notification-email-enabled"]').click();
    await backToOverview(page);
    await expect(page.getByTestId("notification-channel-email")).toContainText("Disabled");
  });

  test("Should toggle a notification event", async ({ dashboardAsOwner: page }) => {
    await page.getByTestId("notification-channel-email").click();
    const toggle = page.getByTestId("notification-event-peer.pending.approval");
    const initial = await toggle.getAttribute("data-state");
    const expected = initial === "checked" ? "unchecked" : "checked";

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", expected);

    // Toggle back to restore
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", initial!);
  });

  test("Should remove the email recipient and leave channel disabled", async ({
    dashboardAsOwner: page,
  }) => {
    await page
      .getByTestId("notification-email-recipient")
      .filter({ hasText: TEST_EMAIL })
      .click({ force: true });
    await expect(
      page.getByTestId("notification-email-recipient").filter({ hasText: TEST_EMAIL }),
    ).not.toBeVisible();

    const toggle = page.locator('[data-testid="notification-email-enabled"]');
    if ((await toggle.getAttribute("data-state")) === "checked") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("data-state", "unchecked");
  });
});

async function backToOverview(page: import("@playwright/test").Page) {
  await page.getByTestId("breadcrumb-item").filter({ hasText: "Notifications" }).click();
}

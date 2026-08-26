import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { deleteNotificationChannelsByType } from "../helpers/api";

test.describe.serial("Settings - Notifications - Slack @notifications", () => {
  test("Should connect Slack through the 2-step wizard", async ({ dashboardAsOwner: page }) => {
    await deleteNotificationChannelsByType(page, "slack");
    await navigateTo(page, "/settings?tab=notifications");
    await expect(page.getByTestId("notification-channel-slack")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("notification-channel-slack").click();
    await expect(page.getByTestId("slack-channel-connect")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("slack-channel-connect").click();
    await expect(page.getByText("Create a Slack App")).toBeVisible();
    await page.getByTestId("slack-continue").click({ force: true });
    await expect(page.getByText("Configure Incoming Webhook")).toBeVisible();
    await page.getByTestId("slack-webhook-url-input").fill("https://hooks.slack.com/services/T000/B000/XXXX");
    await page.getByTestId("slack-connect").click();
    await expect(page.getByTestId("slack-actions")).toBeVisible();
  });

  test("Should show Enabled on overview", async ({ dashboardAsOwner: page }) => {
    await backToOverview(page);
    await expect(page.getByTestId("notification-channel-slack")).toContainText("Enabled");
  });

  test("Should toggle a notification event", async ({ dashboardAsOwner: page }) => {
    await page.getByTestId("notification-channel-slack").click();
    const toggle = page.getByTestId("notification-event-peer.pending.approval");
    const initial = await toggle.getAttribute("data-state");
    const expected = initial === "checked" ? "unchecked" : "checked";

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", expected);

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", initial!);
  });

  test("Should disconnect Slack and show Disabled on overview", async ({
    dashboardAsOwner: page,
  }) => {
    await page.getByTestId("slack-actions").click({ force: true });
    await page.getByTestId("slack-disconnect").click({ force: true });
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await expect(page.getByTestId("slack-channel-connect")).toBeVisible();

    await backToOverview(page);
    await expect(page.getByTestId("notification-channel-slack")).toContainText("Disabled");
  });
});

async function backToOverview(page: import("@playwright/test").Page) {
  await page.getByTestId("breadcrumb-item").filter({ hasText: "Notifications" }).click();
}
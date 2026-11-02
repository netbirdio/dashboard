import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";

test.describe.serial("Settings - Permissions @settings", () => {
  test("Should toggle restrict dashboard for regular users", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/settings?tab=permissions");

    const toggle = page.getByTestId("restrict-regular-users");
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    const initialState = await toggle.getAttribute("data-state");
    const expectedState = initialState === "checked" ? "unchecked" : "checked";

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", expectedState);

    await page.getByTestId("save-permissions-settings").click();
    await expect(page.getByText("updated successfully").first()).toBeVisible();

    // Verify persistence — wait for settings API to load after reload
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/accounts") &&
          resp.request().method() === "GET",
      ),
      page.reload(),
    ]);
    await expect(page.getByTestId("restrict-regular-users")).toHaveAttribute(
      "data-state",
      expectedState,
      { timeout: 15_000 },
    );

    // Toggle back to restore original state
    await page.getByTestId("restrict-regular-users").click();
    await page.getByTestId("save-permissions-settings").click();
    await expect(page.getByText("updated successfully").first()).toBeVisible();
  });
});

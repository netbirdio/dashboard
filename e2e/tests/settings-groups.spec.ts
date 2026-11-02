import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";

test.describe.serial("Settings - Groups @settings", () => {
  test("Should toggle user group propagation", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/settings?tab=groups");

    const toggle = page.getByTestId("user-group-propagation");
    const initialState = await toggle.getAttribute("data-state");
    const expectedState = initialState === "checked" ? "unchecked" : "checked";

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", expectedState);

    await page.getByTestId("save-groups-settings").click();
    await expect(page.getByText("updated successfully").first()).toBeVisible();
    await expect(toggle).toHaveAttribute("data-state", expectedState);

    // Toggle back to restore original state
    await page.getByTestId("user-group-propagation").click();
    await page.getByTestId("save-groups-settings").click();
    await expect(page.getByText("updated successfully").first()).toBeVisible();
  });
});

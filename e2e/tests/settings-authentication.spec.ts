import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";

test.describe.serial("Settings - Authentication @settings", () => {
  test("Should toggle peer approval", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/settings");
    await toggleAndSave(page, "peer-approval");
  });

  test("Should toggle peer login expiration off and back on", async ({
    dashboardAsOwner: page,
  }) => {
    await toggleAndSave(page, "peer-login-expiration");
    await toggleAndSave(page, "peer-login-expiration");
  });

  test("Should change peer login expiration time", async ({ dashboardAsOwner: page }) => {
    await ensureToggleState(page, "peer-login-expiration", "checked");

    // Use a value different from current to ensure the save button enables
    const currentValue = await page.getByTestId("peer-login-expiration-input").inputValue();
    const hoursValue = currentValue === "17" ? "22" : "17";

    await page.getByTestId("peer-login-expiration-input").fill(hoursValue);
    await page.getByTestId("peer-login-expiration-select").click();
    await page
      .getByTestId("peer-login-expiration-select-content")
      .getByText("Hours")
      .click();
    await save(page);
    await expect(page.getByTestId("peer-login-expiration-input")).toHaveValue(hoursValue);

    // Change to a different days value
    const currentDays = await page.getByTestId("peer-login-expiration-input").inputValue();
    const daysValue = currentDays === "180" ? "90" : "180";

    await page.getByTestId("peer-login-expiration-input").fill(daysValue);
    await page.getByTestId("peer-login-expiration-select").click();
    await page
      .getByTestId("peer-login-expiration-select-content")
      .getByText("Days")
      .click();
    await save(page);
    await expect(page.getByTestId("peer-login-expiration-input")).toHaveValue(daysValue);
    await expect(page.getByTestId("peer-login-expiration-select-value")).toContainText("Days");
  });

  test("Should toggle peer inactivity expiration", async ({ dashboardAsOwner: page }) => {
    await toggleAndSave(page, "peer-inactivity-expiration");
  });
});

async function save(page: import("@playwright/test").Page) {
  await page.getByTestId("save-authentication-settings").click();
  await expect(page.getByText("successfully saved").first()).toBeVisible();
}

async function toggleAndSave(
  page: import("@playwright/test").Page,
  name: string,
) {
  const toggle = page.getByTestId(name);
  const initialState = await toggle.getAttribute("data-state");
  const expectedState = initialState === "checked" ? "unchecked" : "checked";
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-state", expectedState);
  await save(page);
}

async function ensureToggleState(
  page: import("@playwright/test").Page,
  name: string,
  desiredState: "checked" | "unchecked",
) {
  const toggle = page.getByTestId(name);
  const currentState = await toggle.getAttribute("data-state");
  if (currentState !== desiredState) {
    await toggle.click();
  }
}

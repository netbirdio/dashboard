import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix } from "../helpers/api";

let peerExposeGroup = "";

test.describe.serial("Settings - Clients @settings", () => {
  test("Should set automatic updates to Latest Version with force updates", async ({
    dashboardAsOwner: page,
  }) => {
    await navigateTo(page, "/settings?tab=clients");

    // Ensure we start from Disabled so the change to Latest Version is always detected
    const currentMethod = await page.getByTestId("auto-update-method").textContent();
    if (currentMethod?.includes("Latest")) {
      await selectAutoUpdateMethod(page, "Disabled");
      await save(page);
    }

    await selectAutoUpdateMethod(page, "Latest Version");
    const forceToggle = page.getByTestId("force-auto-updates");
    if ((await forceToggle.getAttribute("data-state")) !== "checked") {
      await forceToggle.click();
    }
    await expect(forceToggle).toHaveAttribute("data-state", "checked");
    await save(page);
  });

  test("Should switch to Custom Version and disable force updates", async ({
    dashboardAsOwner: page,
  }) => {
    await page.getByTestId("force-auto-updates").click();
    await expect(page.getByTestId("force-auto-updates")).toHaveAttribute("data-state", "unchecked");

    await selectAutoUpdateMethod(page, "Custom Version");
    await page.getByTestId("auto-update-version-input").fill("0.5");
    await save(page);
  });

  test("Should set automatic updates back to Disabled", async ({ dashboardAsOwner: page }) => {
    await selectAutoUpdateMethod(page, "Disabled");
    await save(page);
    await expect(page.getByTestId("auto-update-version-input")).toBeDisabled();
  });

  test("Should enable peer expose with a group", async ({ dashboardAsOwner: page }) => {
    // Ensure peer expose starts disabled for a clean test
    const toggle = page.getByTestId("peer-expose");
    if ((await toggle.getAttribute("data-state")) === "checked") {
      // Remove any existing groups first
      const badges = page.getByTestId("group-badge");
      const count = await badges.count();
      for (let i = 0; i < count; i++) {
        await badges.first().click();
      }
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-state", "unchecked");
      await save(page);
    }

    // Now enable and add group
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", "checked");

    const name = generateRandomName("expose-group-");
    peerExposeGroup = name;
    await page.getByTestId("peer-expose-groups-selector").click();
    const search = page.getByTestId("peer-expose-groups-selector-search");
    await search.fill(name);
    await search.press("Enter");
    await search.press("Escape");
    await save(page);
  });

  test("Should remove the group and disable peer expose", async ({ dashboardAsOwner: page }) => {
    const toggle = page.getByTestId("peer-expose");

    // Remove the group badge if it exists
    const badge = page.getByTestId("group-badge").filter({ hasText: peerExposeGroup });
    if (await badge.first().isVisible().catch(() => false)) {
      await badge.first().click();
      await expect(badge).not.toBeVisible({ timeout: 5_000 });
    }

    // Disable peer expose if enabled
    if ((await toggle.getAttribute("data-state")) === "checked") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("data-state", "unchecked");
    await save(page);

    // Verify peer expose persisted after save
    await page.reload();
    await expect(page.getByTestId("peer-expose")).toHaveAttribute("data-state", "unchecked", { timeout: 10_000 });
    await expect(page.getByTestId("peer-expose")).toHaveAttribute("data-state", "unchecked");
  });

  test("Should toggle lazy connections on and off", async ({ dashboardAsOwner: page }) => {
    const toggle = page.getByTestId("lazy-connections");
    await toggle.click();
    await expect(page.getByText("successfully").first()).toBeVisible();
    await toggle.click();
    await expect(page.getByText("successfully").first()).toBeVisible();
  });

  test("Should delete the created group", async ({ dashboardAsOwner: page }) => {
    if (!peerExposeGroup) return;
    await deleteGroupsByPrefix(page, peerExposeGroup);
  });
});

async function selectAutoUpdateMethod(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.getByTestId("auto-update-method").click({ force: true });
  await page.locator("[cmdk-list]").getByText(label).click();
}

async function save(page: import("@playwright/test").Page) {
  await page.getByTestId("save-clients-settings").click();
  await expect(page.getByText("successfully updated").first()).toBeVisible();
}

import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix } from "../helpers/api";

let trafficGroup = "";
let ipv6Group = "";

test.describe.serial("Settings - Networks @settings", () => {
  test("Should update DNS domain and network range", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/settings?tab=networks");

    const origDomain = await page.getByTestId("dns-domain-input").inputValue();
    const origRange = await page.getByTestId("network-range-input").inputValue();

    // Use values guaranteed to differ from current
    const testDomain = origDomain === "test.internal" ? "test2.internal" : "test.internal";
    const testRange = origRange === "10.100.0.0/16" ? "10.200.0.0/16" : "10.100.0.0/16";

    await page.getByTestId("dns-domain-input").fill(testDomain);
    await page.getByTestId("network-range-input").fill(testRange);
    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();

    // Verify UI shows new values
    await expect(page.getByTestId("dns-domain-input")).toHaveValue(testDomain);
    await expect(page.getByTestId("network-range-input")).toHaveValue(testRange);

    // Revert
    await page.getByTestId("dns-domain-input").fill(origDomain || "netbird.selfhosted");
    await page.getByTestId("network-range-input").fill(origRange || "100.64.0.0/10");
    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();
  });

  test("Should toggle DNS wildcard routing", async ({ dashboardAsOwner: page }) => {
    await toggleAndRevert(page, "dns-wildcard-routing");
  });

  test("Should toggle traffic events", async ({ dashboardAsOwner: page }) => {
    await toggleAndRevert(page, "traffic-events");
  });

  test("Should toggle traffic reporting kernel", async ({ dashboardAsOwner: page }) => {
    await ensureToggleState(page, "traffic-events", "checked");

    const toggle = page.getByTestId("traffic-reporting-kernel");
    await expect(toggle).toBeVisible();

    // Dispatch click via JS to bypass pointer-events interception from parent layout
    await toggle.dispatchEvent("click");

    // Confirmation dialog only appears when turning ON
    const confirmBtn = page.getByTestId("confirmation.confirm");
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
    }
    await expect(page.getByText("successfully").first()).toBeVisible();

    // Toggle back
    await page.getByTestId("traffic-reporting-kernel").dispatchEvent("click");
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
    }
    await expect(page.getByText("successfully").first()).toBeVisible();
  });

  test("Should add a group to traffic events and save", async ({ dashboardAsOwner: page }) => {
    // Clean up stale groups from previous runs
    await deleteGroupsByPrefix(page, "traffic-group-");
    await navigateTo(page, "/settings?tab=networks");

    await ensureToggleState(page, "traffic-events", "checked");

    // Scope to the traffic-events selector so we don't accidentally remove
    // badges from other group selectors on the same page (e.g. IPv6 groups).
    const trafficSelector = page.getByTestId("traffic-events-groups-selector");
    const existingBadges = trafficSelector.getByTestId("group-badge");
    const badgeCount = await existingBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await existingBadges.first().click({ force: true });
    }
    if (badgeCount > 0) {
      await page.getByTestId("save-traffic-groups").click({ force: true });
      await expect(page.getByText("successfully updated").first()).toBeVisible();
    }

    const name = generateRandomName("traffic-group-");
    trafficGroup = name;

    await page.getByTestId("traffic-events-groups-selector-open-close").click({ force: true });
    const search = page.getByTestId("traffic-events-groups-selector-search");
    await expect(search).toBeVisible({ timeout: 5_000 });
    await search.fill(name);
    await search.press("Enter");
    if (await search.isVisible().catch(() => false)) {
      await search.press("Escape");
    }

    await page.getByTestId("save-traffic-groups").click({ force: true });
    await expect(page.getByText("successfully updated").first()).toBeVisible();

    // Verify group is visible in UI within the traffic selector
    await expect(trafficSelector.getByText(name).first()).toBeVisible();

    // Remove the group (force needed due to parent pointer-events interception)
    await trafficSelector.getByTestId("group-badge").filter({ hasText: name }).click({ force: true });
    await page.getByTestId("save-traffic-groups").click({ force: true });
    await expect(page.getByText("successfully updated").first()).toBeVisible();
  });

  test("Should delete the created traffic group", async ({ dashboardAsOwner: page }) => {
    await deleteGroupsByPrefix(page, trafficGroup);
  });

  test("Should update the IPv6 network range", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/settings?tab=networks");

    const input = page.getByTestId("network-range-v6-input");
    await expect(input).toBeVisible();
    const origRange = await input.inputValue();

    // Pick a value guaranteed to differ from the current one
    const testRange =
      origRange === "fd00:1234::/64" ? "fd00:5678::/64" : "fd00:1234::/64";

    await input.fill(testRange);
    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();
    await expect(input).toHaveValue(testRange);

    // Revert
    await input.fill(origRange);
    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();
    await expect(input).toHaveValue(origRange);
  });

  test("Should reject an invalid IPv6 network range", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/settings?tab=networks");

    const input = page.getByTestId("network-range-v6-input");
    const origRange = await input.inputValue();

    // Prefix length outside the allowed /48..../112 window
    await input.fill("fd00:1234::/32");
    await expect(page.getByTestId("save-network-settings")).toBeDisabled();

    // Non-IPv6 string
    await input.fill("not-an-ip");
    await expect(page.getByTestId("save-network-settings")).toBeDisabled();

    // Restore so subsequent tests start from a clean state
    await input.fill(origRange);
  });

  test("Should add and remove a group from IPv6 enabled groups", async ({ dashboardAsOwner: page }) => {
    await deleteGroupsByPrefix(page, "ipv6-group-");
    await navigateTo(page, "/settings?tab=networks");

    const ipv6Selector = page.getByTestId("ipv6-enabled-groups-selector");
    await expect(ipv6Selector).toBeVisible();

    // Start from a clean slate: remove any existing badges scoped to this selector
    const existingBadges = ipv6Selector.getByTestId("group-badge");
    const badgeCount = await existingBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await existingBadges.first().click({ force: true });
    }
    if (badgeCount > 0) {
      await page.getByTestId("save-network-settings").click();
      await expect(page.getByText("successfully updated").first()).toBeVisible();
    }

    const name = generateRandomName("ipv6-group-");
    ipv6Group = name;

    await page.getByTestId("ipv6-enabled-groups-selector-open-close").click({ force: true });
    const search = page.getByTestId("ipv6-enabled-groups-selector-search");
    await expect(search).toBeVisible({ timeout: 5_000 });
    await search.fill(name);
    await search.press("Enter");
    if (await search.isVisible().catch(() => false)) {
      await search.press("Escape");
    }

    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();

    // Verify the new group appears as a badge in the IPv6 selector
    await expect(
      ipv6Selector.getByTestId("group-badge").filter({ hasText: name }),
    ).toBeVisible();

    // Remove the group via the badge and save again
    await ipv6Selector
      .getByTestId("group-badge")
      .filter({ hasText: name })
      .click({ force: true });
    await page.getByTestId("save-network-settings").click();
    await expect(page.getByText("successfully updated").first()).toBeVisible();
    await expect(
      ipv6Selector.getByTestId("group-badge").filter({ hasText: name }),
    ).not.toBeVisible();
  });

  test("Should delete the created IPv6 group", async ({ dashboardAsOwner: page }) => {
    await deleteGroupsByPrefix(page, ipv6Group);
  });
});

async function toggleAndRevert(
  page: import("@playwright/test").Page,
  name: string,
) {
  const toggle = page.getByTestId(name);
  const initialState = await toggle.getAttribute("data-state");
  const expectedState = initialState === "checked" ? "unchecked" : "checked";

  await toggle.click();
  await expect(page.getByText("successfully").first()).toBeVisible();
  await expect(toggle).toHaveAttribute("data-state", expectedState);

  // Toggle back
  await toggle.click();
  await expect(page.getByText("successfully").first()).toBeVisible();
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
    await expect(page.getByText("successfully").first()).toBeVisible();
  }
}

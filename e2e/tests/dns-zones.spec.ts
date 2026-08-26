import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { applyRadioTableFilter, generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix, deleteDnsZonesByPrefix } from "../helpers/api";

let zoneDomain = "";
let zoneGroup = "";
let zoneGroup2 = "";

test.describe.serial("DNS - Zones @dns", () => {
  test("Should add a new zone with a distribution group", async ({ dashboardAsOwner: page }) => {
    // Clean up leftover zones from previous runs
    await deleteDnsZonesByPrefix(page, "dns-zone-");
    await deleteGroupsByPrefix(page, "zone-group-");

    await navigateTo(page, "/dns/zones");

    const name = generateRandomName("dns-zone-");
    zoneDomain = `${name}.test`;

    await page.getByTestId("add-dns-zone").click();
    await page.getByTestId("dns-zone-domain-input").fill(zoneDomain);

    const groupName = generateRandomName("zone-group-");
    zoneGroup = groupName;
    await page.getByTestId("dns-zone-groups-selector").click();
    await page.getByTestId("dns-zone-groups-selector-search").fill(groupName);
    await page.getByTestId("dns-zone-groups-selector-search").press("Enter");
    await page.getByTestId("dns-zone-groups-selector-search").press("Escape");

    await page.getByTestId("dns-zone-search-domains").click();
    await expect(page.getByTestId("dns-zone-enabled")).toHaveAttribute("data-state", "checked");

    await page.getByTestId("submit-dns-zone").click();
    await expect(page.locator("tr").filter({ hasText: zoneDomain })).toBeVisible();
  });

  test("Should add A, AAAA, and CNAME records", async ({ dashboardAsOwner: page }) => {
    const zoneRow = page.locator("tr").filter({ hasText: zoneDomain });

    // Dismiss or use the "Add Record" prompt from zone creation
    const addRecordBtn = page.getByTestId("confirmation.confirm");
    if (await addRecordBtn.isVisible().catch(() => false)) {
      await addRecordBtn.click({ force: true });
    } else {
      await zoneRow.getByTestId("add-dns-record").click({ force: true });
    }
    await expect(page.getByTestId("dns-record-hostname-input")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("dns-record-hostname-input").fill("server1");
    await page.getByTestId("dns-record-content-input").fill("10.0.0.10");
    await page.getByTestId("dns-record-ttl-select").click();
    await page.locator('[role="option"]').filter({ hasText: "1 Min." }).click({ force: true });
    await page.getByTestId("submit-dns-record").click();
    await expect(zoneRow.getByTestId("dns-zone-records-count")).toContainText("1");

    // AAAA record
    await zoneRow.getByTestId("add-dns-record").click({ force: true });
    await page.getByTestId("dns-record-type-select").click();
    await page.locator('[role="option"]').filter({ hasText: "AAAA" }).click({ force: true });
    await page.getByTestId("dns-record-hostname-input").fill("server2");
    await page.getByTestId("dns-record-content-input").fill("2001:db8::1");
    await page.getByTestId("submit-dns-record").click();
    await expect(zoneRow.getByTestId("dns-zone-records-count")).toContainText("2");

    // CNAME record
    await zoneRow.getByTestId("add-dns-record").click({ force: true });
    await page.getByTestId("dns-record-type-select").click();
    await page.locator('[role="option"]').filter({ hasText: "CNAME" }).click({ force: true });
    await page.getByTestId("dns-record-hostname-input").fill("alias");
    await page.getByTestId("dns-record-content-input").fill("server1.example.com");
    await page.getByTestId("submit-dns-record").click();
    await expect(zoneRow.getByTestId("dns-zone-records-count")).toContainText("3");
  });

  test("Should edit a record", async ({ dashboardAsOwner: page }) => {
    await page.reload();
    // Expand accordion to show records
    await page.locator("tr").filter({ hasText: zoneDomain }).first().click({ force: true });
    await expect(page.getByText("10.0.0.10")).toBeVisible({ timeout: 10_000 });

    // Edit A record
    await page.getByTestId("edit-dns-record").first().click({ force: true });
    await page.getByTestId("dns-record-hostname-input").fill("web1");
    await page.getByTestId("dns-record-content-input").fill("10.0.0.99");
    await page.getByTestId("submit-dns-record").click();
    await expect(page.getByText(`web1.${zoneDomain}`).first()).toBeVisible();
  });

  test("Should toggle active and search domain states", async ({ dashboardAsOwner: page }) => {
    await page.reload();
    const row = page.locator("tr").filter({ hasText: zoneDomain });

    // Active state moved into the row action menu (Enable/Disable item).
    // Zone starts enabled → item reads "Disable"; toggle off then on,
    // reopening the menu each time to read the updated label.
    // Two races to defend against on each toggle:
    //  1. Radix leaves `pointer-events: none` on body briefly during the
    //     close transition — re-opening without `force: true` makes
    //     Playwright auto-wait for the body to accept pointer events.
    //  2. The toggle's PUT resolves before SWR refetches `/dns/zones`, so
    //     the row's `zone.enabled` is stale and the re-opened menu shows
    //     the old label. Wait for the GET refetch before re-opening.
    const actions = row.getByTestId("dns-zone-actions");
    const toggle = page.getByTestId("dns-zone-active-toggle");
    const waitForRefetch = () =>
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/dns/zones") &&
          r.request().method() === "GET" &&
          r.ok(),
        { timeout: 10_000 },
      );

    await actions.click({ force: true });
    let refetch = waitForRefetch();
    await toggle.click({ force: true });
    await refetch;

    await expect(toggle).toBeHidden();
    await actions.click();
    await expect(toggle).toContainText("Enable");
    refetch = waitForRefetch();
    await toggle.click({ force: true });
    await refetch;

    await expect(toggle).toBeHidden();
    await actions.click();
    await expect(toggle).toContainText("Disable");
    await page.keyboard.press("Escape");

    // Toggle search domain off
    const searchToggle = row.getByTestId("dns-zone-search-domain-toggle");
    await searchToggle.click({ force: true });
    await expect(searchToggle).toHaveAttribute("data-state", "unchecked");
  });

  test("Should update distribution groups", async ({ dashboardAsOwner: page }) => {
    const newGroup = generateRandomName("zone-group-");
    zoneGroup2 = newGroup;

    await page.locator("tr").filter({ hasText: zoneDomain }).getByTestId("multiple-groups").click({ force: true });
    await expect(page.getByTestId("save-groups")).toBeVisible();

    await page.getByTestId("group-selector-dropdown").click();
    await page.getByTestId("group-selector-dropdown-search").fill(newGroup);
    await page.getByTestId("group-selector-dropdown-search").press("Enter");
    await page.getByTestId("group-selector-dropdown-search").press("Escape");

    await page.getByTestId("save-groups").click();
    await expect(page.getByTestId("save-groups")).not.toBeVisible();
  });

  test("Should edit the zone and toggle settings back", async ({ dashboardAsOwner: page }) => {
    // Page is on /dns/zones from previous test
    await page.locator("tr").filter({ hasText: zoneDomain }).getByTestId("dns-zone-actions").click({ force: true });
    await page.getByTestId("edit-dns-zone").click({ force: true });

    await page.getByTestId("dns-zone-search-domains").click();
    await expect(page.getByTestId("dns-zone-search-domains")).toHaveAttribute("data-state", "checked");

    await page.getByTestId("submit-dns-zone").click();
  });

  test("Should filter and search zones", async ({ dashboardAsOwner: page }) => {
    await page.reload();
    const zoneRow = page.locator("tr").filter({ hasText: zoneDomain }).first();

    // Filter: Active should show, Inactive should hide
    await applyRadioTableFilter(page, "enabled", "Active");
    await expect(zoneRow).toBeVisible();
    await applyRadioTableFilter(page, "enabled", "Inactive");
    await expect(zoneRow).toBeHidden();
    await applyRadioTableFilter(page, "enabled", "All");

    // Search by domain
    const searchInput = page.getByTestId("table-search-input");
    await searchInput.fill(zoneDomain);
    await expect(page.locator("tr").filter({ hasText: zoneDomain })).toBeVisible();

    // Search by content
    await searchInput.fill("10.0.0.99");
    await expect(page.locator("tr").filter({ hasText: zoneDomain })).toBeVisible();

    // Search by group
    await searchInput.fill(zoneGroup);
    await expect(page.locator("tr").filter({ hasText: zoneDomain })).toBeVisible();
    await searchInput.fill("");
  });

  test("Should delete the zone and groups", async ({ dashboardAsOwner: page }) => {
    await deleteDnsZonesByPrefix(page, zoneDomain);
    for (const group of [zoneGroup, zoneGroup2]) {
      if (!group) continue;
      await deleteGroupsByPrefix(page, group);
    }
  });
});

import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteGroupsByPrefix, deleteNameserverGroupsByPrefix } from "../helpers/api";

let nsName = "";
let nsDomain = "";
let nsGroup1 = "";
let nsGroup2 = "";

test.describe.serial("DNS - Nameservers @dns", () => {
  test("Should show all 4 DNS presets and create a custom nameserver", async ({
    dashboardAsOwner: page,
  }) => {
    // Clean up stale nameservers and groups from previous runs
    await deleteNameserverGroupsByPrefix(page, "test-ns-");
    await deleteNameserverGroupsByPrefix(page, "renamed-ns-");
    await deleteGroupsByPrefix(page, "ns-group-");
    await deleteGroupsByPrefix(page, "ns-domain-");

    await navigateTo(page, "/dns/nameservers");

    await page.getByTestId("open-add-nameserver").click();
    await expect(page.getByTestId("nameserver-preset-google")).toBeVisible();
    await expect(page.getByTestId("nameserver-preset-cloudflare")).toBeVisible();
    await expect(page.getByTestId("nameserver-preset-quad9")).toBeVisible();
    await expect(page.getByTestId("nameserver-preset-custom")).toBeVisible();

    // Create via Custom DNS
    await page.getByTestId("nameserver-preset-custom").click();

    await page.getByTestId("nameserver-ip-input").first().fill("10.0.0.1");
    await page.getByTestId("add-nameserver-row").click();
    await page.getByTestId("nameserver-ip-input").last().fill("10.0.0.2");
    await page.getByTestId("nameserver-port-input").last().fill("5353");

    const groupName = generateRandomName("ns-group-");
    nsGroup1 = groupName;
    await page.getByTestId("nameserver-groups-selector").click();
    await page.getByTestId("nameserver-groups-selector-search").fill(groupName);
    await page.getByTestId("nameserver-groups-selector-search").press("Enter");
    await page.getByTestId("nameserver-groups-selector-search").press("Escape");

    await page.getByTestId("nameserver-continue").click();

    // Domains tab
    const d = generateRandomName("ns-domain-");
    nsDomain = `${d}.internal`;
    await page.getByTestId("add-match-domain").click();
    await page.getByTestId("domain-input").last().fill(nsDomain);
    await page.getByTestId("nameserver-mark-search-domains").click();

    await page.getByTestId("nameserver-continue").click();

    // General tab
    const name = generateRandomName("test-ns-");
    nsName = name;
    await page.getByTestId("nameserver-name-input").fill(name);
    await page.getByTestId("nameserver-description-input").fill("Test nameserver");

    await page.getByTestId("submit-nameserver").click();
  });

  test("Should verify the nameserver in the table", async ({ dashboardAsOwner: page }) => {
    const row = page.locator("tr").filter({ hasText: nsName });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText(nsDomain)).toBeVisible();
    await expect(row.getByText("10.0.0.1")).toBeVisible();
    await expect(row.getByText("10.0.0.2")).toBeVisible();
    await expect(row.getByText(nsGroup1)).toBeVisible();
    // Active state moved into the row action menu: a freshly-created
    // nameserver is enabled, so the toggle item reads "Disable".
    await row.getByTestId("nameserver-actions").click({ force: true });
    await expect(page.getByTestId("nameserver-active-toggle")).toContainText(
      "Disable",
    );
    await page.keyboard.press("Escape");
  });

  test("Should edit the nameserver", async ({ dashboardAsOwner: page }) => {
    await page.locator("tr").filter({ hasText: nsName }).getByTestId("nameserver-name-cell").click({ force: true });

    // Nameserver tab — change IPs and add group
    await page.getByTestId("nameserver-tab-nameserver").click({ force: true });
    await expect(page.getByTestId("nameserver-ip-input").first()).toBeVisible();
    await page.getByTestId("nameserver-ip-input").first().fill("192.168.1.1");
    await page.getByTestId("nameserver-ip-input").last().fill("192.168.1.2");

    const groupName = generateRandomName("ns-group-");
    nsGroup2 = groupName;
    await page.getByTestId("nameserver-groups-selector").click();
    await page.getByTestId("nameserver-groups-selector-search").fill(groupName);
    await page.getByTestId("nameserver-groups-selector-search").press("Enter");
    await page.getByTestId("nameserver-groups-selector-search").press("Escape");

    // Domains tab — remove domain
    await page.getByTestId("nameserver-tab-domains").click({ force: true });
    await page.getByTestId("domain-input-remove").click({ force: true });

    // General tab — rename
    await page.getByTestId("nameserver-tab-general").click({ force: true });
    const newName = generateRandomName("renamed-ns-");
    await page.getByTestId("nameserver-name-input").fill(newName);
    await page.getByTestId("nameserver-description-input").fill("Updated");

    await page.getByTestId("submit-nameserver").click();
    await expect(page.getByText("successfully").first()).toBeVisible({ timeout: 10_000 });
    // Verify the renamed nameserver appears in the table
    await expect(page.locator("tr").filter({ hasText: newName })).toBeVisible({ timeout: 10_000 });
    nsName = newName;
  });

  test("Should verify edits and toggle active state", async ({ dashboardAsOwner: page }) => {
    await navigateTo(page, "/dns/nameservers");
    const row = page.locator("tr").filter({ hasText: nsName });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText("192.168.1.1")).toBeVisible();
    await expect(row.getByText("192.168.1.2")).toBeVisible();
    // Distribution-groups cell now renders a count badge (2 groups after edit).
    await expect(row.getByText("2 Groups")).toBeVisible();

    // Toggle active off and back on via the row action menu.
    // Two races to defend against on each toggle:
    //  1. Radix leaves `pointer-events: none` on body briefly during the
    //     close transition — re-opening without `force: true` makes
    //     Playwright auto-wait for the body to accept pointer events.
    //  2. The toast fires before SWR refetches `/dns/nameservers`, so the
    //     row's `ns.enabled` is stale and the re-opened menu shows the
    //     old label. Wait for the GET refetch before re-opening.
    const actions = row.getByTestId("nameserver-actions");
    const toggle = page.getByTestId("nameserver-active-toggle");
    const waitForRefetch = () =>
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/dns/nameservers") &&
          r.request().method() === "GET" &&
          r.ok(),
        { timeout: 10_000 },
      );

    await actions.click({ force: true });
    let refetch = waitForRefetch();
    await toggle.click({ force: true });
    await expect(page.getByText("successfully disabled").first()).toBeVisible();
    await refetch;

    await expect(toggle).toBeHidden();
    await actions.click();
    await expect(toggle).toContainText("Enable");
    refetch = waitForRefetch();
    await toggle.click({ force: true });
    await expect(page.getByText("successfully enabled").first()).toBeVisible();
    await refetch;
    await expect(toggle).toBeHidden();
  });

  test("Should delete the nameserver and groups", async ({ dashboardAsOwner: page }) => {
    await page.locator("tr").filter({ hasText: nsName }).getByTestId("nameserver-actions").click({ force: true });
    await page.getByTestId("delete-nameserver").click({ force: true });
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await expect(page.locator("tr").filter({ hasText: nsName })).not.toBeVisible();

    for (const group of [nsGroup1, nsGroup2]) {
      if (!group) continue;
      await deleteGroupsByPrefix(page, group);
    }
  });
});

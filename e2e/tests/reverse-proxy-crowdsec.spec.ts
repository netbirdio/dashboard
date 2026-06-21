import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteNetworksByPrefix, deleteServicesByPrefix } from "../helpers/api";
import {
  gotoReverseProxyPage,
  selectL4Resource,
  selectProxyDomain,
  openServiceEdit,
  deleteService,
  resetServiceFilters,
  CUSTOM_PORTS_DOMAIN,
} from "../helpers/reverse-proxy-l4";

const DOMAINS_GLOB = "**/reverse-proxies/domains";

// Force the test clusters to advertise CrowdSec support so the selector renders,
// independent of whether the test backend has CrowdSec configured. The save
// payload assertion below verifies the real wiring regardless of the backend.
async function forceCrowdSecSupport(page: import("@playwright/test").Page) {
  await page.route(DOMAINS_GLOB, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    let body: any;
    try {
      body = await response.json();
    } catch (e) {
      return route.fulfill({ response });
    }
    if (Array.isArray(body)) {
      body = body.map((d) => ({ ...d, supports_crowdsec: true }));
    }
    return route.fulfill({ response, json: body });
  });
}

test.describe.serial("Reverse Proxy - CrowdSec @reverse-proxy", () => {
  let network = "";
  let resource = "";
  let subdomain = "";

  test("Should configure CrowdSec on a service and send crowdsec_mode on save", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(90_000);
    await forceCrowdSecSupport(page);
    await deleteServicesByPrefix(page, "crowdsec-svc-");
    await deleteNetworksByPrefix(page, "rp-crowdsec-net-");

    // Create a network with a resource (same inline flow as the L4 specs).
    await navigateTo(page, "/networks");
    network = generateRandomName("rp-crowdsec-net-");
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(network);
    await page.getByTestId("submit-network").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });

    resource = generateRandomName("rp-resource-");
    await page.getByTestId("resource-name-input").fill(resource);
    await page.getByTestId("resource-address-input").fill("10.99.99.40");
    await page.getByTestId("resource-continue").click();
    const resourcePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/networks/") &&
        resp.url().includes("/resources") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-resource").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await resourcePromise;
    const cancelBtn = page.getByTestId("confirmation.cancel");
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click({ force: true });
    }

    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    subdomain = generateRandomName("crowdsec-svc-");

    await page.getByTestId("add-service").first().click();
    await expect(page.getByTestId("proxy-subdomain-input")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("proxy-subdomain-input").fill(subdomain);
    await selectProxyDomain(page, CUSTOM_PORTS_DOMAIN);
    await page
      .getByTestId("service-mode-select-button")
      .click({ force: true });
    await page.getByTestId("service-mode-option-tcp").click({ force: true });
    await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({
      timeout: 10_000,
    });
    await selectL4Resource(page, resource);
    await expect(page.getByTestId("listen-port-input")).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId("listen-port-input").fill("3306");
    await page.getByTestId("destination-port-input").fill("3306");
    await page.getByTestId("proxy-continue").click();

    // Access control step: the CrowdSec selector renders for supporting clusters.
    const crowdsecTrigger = page.getByTestId("crowdsec-mode-trigger");
    await expect(crowdsecTrigger).toBeVisible({ timeout: 10_000 });
    await crowdsecTrigger.click({ force: true });
    await page.getByTestId("crowdsec-mode-enforce").click({ force: true });
    await expect(crowdsecTrigger).toContainText("Enforce");

    await page.getByTestId("proxy-continue").click();

    const savePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/reverse-proxies/services") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-service").click();
    const saveResp = await savePromise;

    // Core assertion: the configured mode is included in the save payload.
    const payload = saveResp.request().postDataJSON();
    expect(
      payload?.access_restrictions?.crowdsec_mode,
      "crowdsec_mode should be sent in the service payload",
    ).toBe("enforce");

    await resetServiceFilters(page);
    await expect(
      page.locator("tr").filter({ hasText: subdomain }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Should show CrowdSec in the access control cell and persist on reopen", async ({
    dashboardAsOwner: page,
  }) => {
    test.setTimeout(60_000);
    await forceCrowdSecSupport(page);
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    await resetServiceFilters(page);

    // The access control cell counts CrowdSec as a rule and lists it on hover.
    const cell = page
      .locator("tr")
      .filter({ hasText: subdomain })
      .locator("[data-access-control-cell]");
    await expect(cell).toContainText("1", { timeout: 10_000 });

    // Reopen the service: the selector reflects the persisted Enforce mode.
    await openServiceEdit(page, subdomain);
    await page.getByTestId("proxy-tab-access-control").click({ force: true });
    await expect(page.getByTestId("crowdsec-mode-trigger")).toContainText(
      "Enforce",
      { timeout: 10_000 },
    );
    await page.keyboard.press("Escape");
  });

  test("Should clean up the CrowdSec service and network", async ({
    dashboardAsOwner: page,
  }) => {
    await forceCrowdSecSupport(page);
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    await resetServiceFilters(page);
    await deleteService(page, subdomain);
    await deleteNetworksByPrefix(page, network);
    await page.unroute(DOMAINS_GLOB);
  });
});

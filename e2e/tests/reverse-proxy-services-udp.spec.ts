import { test, expect } from "../helpers/fixtures";
import { navigateTo } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import { deleteNetworksByPrefix, deleteServicesByPrefix } from "../helpers/api";
import {
  gotoReverseProxyPage,
  selectL4Resource,
  addAccessControlRules,
  removeAllAccessControlRules,
  resetServiceFilters,
  openServiceEdit,
  deleteService,
  saveServiceEdit,
  selectProxyDomain,
  CUSTOM_PORTS_DOMAIN,
} from "../helpers/reverse-proxy-l4";

let udpNetwork = "";
let udpResource = "";
let udpSubdomain = "";

test.describe.serial("Reverse Proxy - Services (UDP) @reverse-proxy", () => {
  test("Should create a network with a resource", async ({ dashboardAsOwner: page }) => {
    await deleteServicesByPrefix(page, "udp-svc-");
    await deleteNetworksByPrefix(page, "rp-udp-net-");
    await navigateTo(page, "/networks");

    const name = generateRandomName("rp-udp-net-");
    udpNetwork = name;
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(name);
    await page.getByTestId("submit-network").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });

    const resName = generateRandomName("rp-resource-");
    udpResource = resName;
    await page.getByTestId("resource-name-input").fill(resName);
    await page.getByTestId("resource-address-input").fill("10.99.99.40");
    await page.getByTestId("resource-continue").click();

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/networks/") &&
        resp.url().includes("/resources") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByTestId("submit-resource").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });
    await responsePromise;
    const cancelBtn = page.getByTestId("confirmation.cancel");
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click({ force: true });
    }
  });

  test("Should create a UDP service", async ({ dashboardAsOwner: page }) => {
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    const subdomain = generateRandomName("udp-svc-");
    udpSubdomain = subdomain;

    await page.getByTestId("add-service").first().click();
    await expect(page.getByTestId("proxy-subdomain-input")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("proxy-subdomain-input").fill(subdomain);
    await selectProxyDomain(page, CUSTOM_PORTS_DOMAIN);
    await page.getByTestId("service-mode-select-button").click({ force: true });
    await page.getByTestId("service-mode-option-udp").click({ force: true });
    // Wait for mode switch to take effect
    await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({ timeout: 10_000 });

    await selectL4Resource(page, udpResource);
    await expect(page.getByTestId("listen-port-input")).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId("listen-port-input").fill("5060");
    await page.getByTestId("destination-port-input").fill("5060");
    await page.getByTestId("proxy-continue").click();

    await addAccessControlRules(page);
    await page.getByTestId("proxy-continue").click();

    await page.getByTestId("connection-timeout-input").fill("30s");
    await page.getByTestId("submit-service").click();

    await resetServiceFilters(page);
    await expect(page.locator("tr").filter({ hasText: subdomain }).getByText("UDP", { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("Should edit the UDP service and delete it", async ({ dashboardAsOwner: page }) => {
    await openServiceEdit(page, udpSubdomain);

    await page.getByTestId("listen-port-input").fill("5061");
    await page.getByTestId("destination-port-input").fill("5061");

    await page.getByTestId("proxy-tab-access-control").click({ force: true });
    await removeAllAccessControlRules(page);

    await page.getByTestId("proxy-tab-settings").click({ force: true });
    await page.getByTestId("connection-timeout-input").fill("");

    await saveServiceEdit(page);

    await resetServiceFilters(page);
    const row = page.locator("tr").filter({ hasText: udpSubdomain });
    await expect(row.locator("[data-access-control-cell]")).toContainText("0");

    await deleteService(page, udpSubdomain);
  });

  test("Should delete the network", async ({ dashboardAsOwner: page }) => {
    await deleteNetworksByPrefix(page, udpNetwork);
  });
});

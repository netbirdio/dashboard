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
  NO_CUSTOM_PORTS_DOMAIN,
} from "../helpers/reverse-proxy-l4";

let udpNetwork = "";
let udpResource = "";
let udpSubdomain = "";

test.describe
  .serial("Reverse Proxy - Services (UDP, no custom ports) @reverse-proxy", () => {
  test("Should create a network with a resource", async ({
    dashboardAsOwner: page,
  }) => {
    await deleteServicesByPrefix(page, "udp-np-svc-");
    await deleteNetworksByPrefix(page, "rp-udp-np-net-");
    await navigateTo(page, "/networks");

    const name = generateRandomName("rp-udp-np-net-");
    udpNetwork = name;
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(name);
    await page.getByTestId("submit-network").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });

    const resName = generateRandomName("rp-resource-");
    udpResource = resName;
    await page.getByTestId("resource-name-input").fill(resName);
    await page.getByTestId("resource-address-input").fill("10.99.99.41");
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

  test("Should create a UDP service on the no-custom-ports cluster", async ({
    dashboardAsOwner: page,
  }) => {
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    const subdomain = generateRandomName("udp-np-svc-");
    udpSubdomain = subdomain;

    await page.getByTestId("add-service").first().click();
    await expect(page.getByTestId("proxy-subdomain-input")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("proxy-subdomain-input").fill(subdomain);

    await selectProxyDomain(page, NO_CUSTOM_PORTS_DOMAIN);

    await page.getByTestId("service-mode-select-button").click({ force: true });
    await page.getByTestId("service-mode-option-udp").click({ force: true });
    await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({
      timeout: 10_000,
    });

    await selectL4Resource(page, udpResource);

    // Listen port is auto-assigned when the cluster has custom ports disabled
    await expect(page.getByTestId("listen-port-input")).toBeDisabled({
      timeout: 10_000,
    });
    await expect(page.getByTestId("listen-port-input")).toHaveAttribute(
      "placeholder",
      "Auto",
    );

    await page.getByTestId("destination-port-input").fill("5060");
    await page.getByTestId("destination-port-end-0").fill("5061");
    await expect(
      page.getByText(
        "An auto-assigned listener supports one destination port, not a range.",
      ),
    ).toBeVisible();
    await page.getByTestId("destination-port-end-0").fill("5060");
    await page.getByTestId("proxy-continue").click();

    await addAccessControlRules(page);
    await page.getByTestId("proxy-continue").click();

    await page.getByTestId("udp-session-timeout-input").fill("30s");
    await page.getByTestId("submit-service").click();

    await resetServiceFilters(page);
    const row = page.locator("tr").filter({ hasText: subdomain });
    await expect(row.getByText("UDP", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(row).toContainText(NO_CUSTOM_PORTS_DOMAIN);
  });

  test("Should edit the UDP service and delete it", async ({
    dashboardAsOwner: page,
  }) => {
    await openServiceEdit(page, udpSubdomain);

    // Listen port must remain auto-assigned on this cluster
    await expect(page.getByTestId("listen-port-input")).toBeDisabled();

    await page.getByTestId("destination-port-input").fill("5061");

    await page.getByTestId("proxy-tab-access-control").click({ force: true });
    await removeAllAccessControlRules(page);

    await page.getByTestId("proxy-tab-settings").click({ force: true });
    await page.getByTestId("udp-session-timeout-input").fill("");

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

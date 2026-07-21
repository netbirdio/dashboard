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

let tcpNetwork = "";
let tcpResource = "";
let tcpSubdomain = "";

test.describe.serial("Reverse Proxy - Services (TCP) @reverse-proxy", () => {
  test("Should create a network with a resource", async ({
    dashboardAsOwner: page,
  }) => {
    await deleteServicesByPrefix(page, "tcp-svc-");
    await deleteNetworksByPrefix(page, "rp-tcp-net-");
    await navigateTo(page, "/networks");

    const name = generateRandomName("rp-tcp-net-");
    tcpNetwork = name;
    await page.getByTestId("add-network").click();
    await page.getByTestId("network-name-input").fill(name);
    await page.getByTestId("submit-network").click();
    await page.getByTestId("confirmation.confirm").click({ force: true });

    const resName = generateRandomName("rp-resource-");
    tcpResource = resName;
    await page.getByTestId("resource-name-input").fill(resName);
    await page.getByTestId("resource-address-input").fill("10.99.99.30");
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

  test("Should create a mixed multi-port service", async ({
    dashboardAsOwner: page,
  }) => {
    await gotoReverseProxyPage(page, "/reverse-proxy/services");
    const subdomain = generateRandomName("tcp-svc-");
    tcpSubdomain = subdomain;

    await page.getByTestId("add-service").first().click();
    await expect(page.getByTestId("proxy-subdomain-input")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("proxy-subdomain-input").fill(subdomain);
    await selectProxyDomain(page, CUSTOM_PORTS_DOMAIN);
    await page.getByTestId("service-mode-select-button").click({ force: true });
    await page.getByTestId("service-mode-option-tcp").click({ force: true });
    await expect(page.getByTestId("group-selector-dropdown")).toBeVisible({
      timeout: 10_000,
    });

    await selectL4Resource(page, tcpResource);
    await expect(page.getByTestId("listen-port-input")).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId("listen-port-input").fill("3306");
    await page.getByTestId("destination-port-input").fill("3306");

    await page.getByTestId("add-port-mapping").click();
    await page.getByTestId("listen-port-start-1").fill("3307");
    await page.getByTestId("destination-port-start-1").fill("3307");
    await page.getByTestId("destination-port-end-1").fill("3308");
    await expect(page.getByText(/same number of ports/i)).toBeVisible();
    await page.getByTestId("destination-port-end-1").fill("3307");

    await page.getByTestId("add-port-mapping").click();
    const udpMapping = page.getByTestId("port-mapping-2");
    await udpMapping.getByRole("combobox").click();
    await page.getByRole("option", { name: "UDP", exact: true }).click();
    await page.getByTestId("listen-port-start-2").fill("3308");
    await page.getByTestId("destination-port-start-2").fill("3308");
    await page.getByRole("button", { name: "Move mapping 3 up" }).click();

    await page.getByTestId("proxy-continue").click();

    await addAccessControlRules(page);
    await page.getByTestId("proxy-continue").click();

    await page.getByTestId("connection-timeout-input").fill("20s");
    await page.getByTestId("udp-session-timeout-input").fill("30s");
    await page.getByTestId("toggle-preserve-client-ip").click();
    await page.getByTestId("submit-service").click();

    await resetServiceFilters(page);
    await expect(
      page
        .locator("tr")
        .filter({ hasText: subdomain })
        .getByText("TCP", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Should edit the TCP service and delete it", async ({
    dashboardAsOwner: page,
  }) => {
    await openServiceEdit(page, tcpSubdomain);

    await expect(page.locator('[data-testid^="port-mapping-"]')).toHaveCount(3);

    await page.getByRole("button", { name: "Move mapping 2 up" }).click();
    await page.getByRole("button", { name: "Move mapping 1 down" }).click();
    await page.getByRole("button", { name: "Remove mapping 3" }).click();
    await expect(page.locator('[data-testid^="port-mapping-"]')).toHaveCount(2);

    await page.getByTestId("listen-port-input").fill("5432");
    await page.getByTestId("destination-port-input").fill("5432");

    await page.getByTestId("proxy-tab-access-control").click({ force: true });
    await removeAllAccessControlRules(page);

    await page.getByTestId("proxy-tab-settings").click({ force: true });
    await page.getByTestId("toggle-preserve-client-ip").click({ force: true });
    await page.getByTestId("connection-timeout-input").fill("15s");

    await saveServiceEdit(page);

    await resetServiceFilters(page);
    const row = page.locator("tr").filter({ hasText: tcpSubdomain });
    await expect(row.locator("[data-access-control-cell]")).toContainText("0", {
      timeout: 10_000,
    });

    await deleteService(page, tcpSubdomain);
  });

  test("Should delete the network", async ({ dashboardAsOwner: page }) => {
    await deleteNetworksByPrefix(page, tcpNetwork);
  });
});

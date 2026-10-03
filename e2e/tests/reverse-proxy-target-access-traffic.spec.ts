import type { Page, TestInfo } from "@playwright/test";
import {
  deleteServicesByPrefix,
  waitForProxyClustersOnline,
} from "../helpers/api";
import { expect, test } from "../helpers/fixtures";
import {
  CUSTOM_PORTS_DOMAIN,
  deleteService,
  gotoReverseProxyPage,
  openServiceEdit,
  selectProxyDomain,
} from "../helpers/reverse-proxy-l4";
import {
  EchoedRequest,
  getReverseProxyTrafficEnvironment,
  requestThroughReverseProxy,
  ReverseProxyResponse,
  startEchoUpstream,
} from "../helpers/reverse-proxy-traffic";
import { generateRandomName } from "../helpers/utils";

const SERVICE_PREFIX = "target-access-traffic-";
const AUTH_USER = "traffic-user";
const AUTH_PASSWORD = "traffic-secret";
const APPLICATION_HEADER = "preserved-by-proxy";
const APPLICATION_COOKIE = "application_session=e2e-visible";
const PROXY_SESSION_COOKIE = "nb_session=e2e-spoofed";
const VALID_AUTH = `Basic ${Buffer.from(
  `${AUTH_USER}:${AUTH_PASSWORD}`,
).toString("base64")}`;
const WRONG_AUTH = `Basic ${Buffer.from(`${AUTH_USER}:wrong`).toString(
  "base64",
)}`;

test.describe("Reverse Proxy - Target Access Real Traffic @reverse-proxy", () => {
  test("configures, enforces, updates, and removes target access actions", async ({
    dashboardAsOwner: page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const environment = getReverseProxyTrafficEnvironment();
    const upstream = await startEchoUpstream();
    const subdomain = generateRandomName(SERVICE_PREFIX);
    const serviceDomain = `${subdomain}.${CUSTOM_PORTS_DOMAIN}`;

    try {
      await deleteServicesByPrefix(page, SERVICE_PREFIX);
      await waitForProxyClustersOnline(page, [CUSTOM_PORTS_DOMAIN], 30_000);
      await createService(
        page,
        {
          subdomain,
          upstreamHost: environment.upstreamHost,
          upstreamPort: upstream.port,
        },
        testInfo,
      );

      const initialUpstreamCount = upstream.snapshot().length;
      const inheritedMissing = await waitForStatus(
        serviceDomain,
        "/private",
        401,
      );
      expect(inheritedMissing.status).toBe(401);
      expect(upstream.snapshot()).toHaveLength(initialUpstreamCount);

      const inheritedWrong = await requestThroughReverseProxy(
        serviceDomain,
        "/private",
        { Authorization: WRONG_AUTH },
      );
      expect(inheritedWrong.status).toBe(401);
      expect(upstream.snapshot()).toHaveLength(initialUpstreamCount);

      const upstreamReady = await waitForStatus(
        serviceDomain,
        "/warm-upstream-ready",
        200,
        { Authorization: VALID_AUTH },
      );
      expect(parseEcho(upstreamReady).path).toBe("/warm-upstream-ready");
      expect(upstream.snapshot().at(-1)?.path).toBe("/warm-upstream-ready");

      const beforeInherited = upstream.snapshot().length;
      const inherited = await requestThroughReverseProxy(
        serviceDomain,
        "/private",
        {
          Authorization: VALID_AUTH,
          "X-E2E-App": APPLICATION_HEADER,
          Cookie: APPLICATION_COOKIE,
          "X-NetBird-User": "spoofed@example.com",
          "X-NetBird-Groups": "administrators",
        },
      );
      expect(
        inherited.status,
        `authenticated inherit response: ${inherited.body.slice(0, 500)}`,
      ).toBe(200);
      expect(upstream.snapshot()).toHaveLength(beforeInherited + 1);
      const inheritedEcho = parseEcho(inherited);
      expect(inheritedEcho.path).toBe("/private");
      expect(inheritedEcho.headers.authorization).toBeUndefined();
      expect(inheritedEcho.headers["x-e2e-app"]).toBe(APPLICATION_HEADER);
      expect(inheritedEcho.headers.cookie).toContain(APPLICATION_COOKIE);
      expect(inheritedEcho.headers["x-netbird-user"]).toBeUndefined();
      expect(inheritedEcho.headers["x-netbird-groups"]).toBeUndefined();

      const anonymousBypass = await requestThroughReverseProxy(
        serviceDomain,
        "/public/anonymous",
      );
      expect(anonymousBypass.status).toBe(200);
      expect(parseEcho(anonymousBypass).path).toBe("/anonymous");

      const bypassed = await requestThroughReverseProxy(
        serviceDomain,
        "/public/ready",
        {
          Authorization: WRONG_AUTH,
          "X-E2E-App": APPLICATION_HEADER,
          Cookie: `${PROXY_SESSION_COOKIE}; ${APPLICATION_COOKIE}`,
          "X-NetBird-User": "spoofed@example.com",
          "X-NetBird-Groups": "administrators",
        },
      );
      expect(bypassed.status).toBe(200);
      const bypassedEcho = parseEcho(bypassed);
      expect(bypassedEcho.path).toBe("/ready");
      expect(bypassedEcho.headers.authorization).toBeUndefined();
      expect(bypassedEcho.headers["x-e2e-app"]).toBe(APPLICATION_HEADER);
      expect(bypassedEcho.headers.cookie).toContain(APPLICATION_COOKIE);
      expect(bypassedEcho.headers.cookie).not.toContain("nb_session=");
      expect(bypassedEcho.headers["x-netbird-user"]).toBeUndefined();
      expect(bypassedEcho.headers["x-netbird-groups"]).toBeUndefined();

      const literalPrefix = await requestThroughReverseProxy(
        serviceDomain,
        "/publicity",
      );
      expect(literalPrefix.status).toBe(200);
      expect(parseEcho(literalPrefix).path).toBe("/ity");

      const beforeBlock = upstream.snapshot().length;
      const blocked = await requestThroughReverseProxy(
        serviceDomain,
        "/public/admin/secret",
        { Authorization: VALID_AUTH },
      );
      expect(blocked.status).toBe(403);
      expect(blocked.headers["cache-control"]).toBe("no-store");
      expect(upstream.snapshot()).toHaveLength(beforeBlock);

      await editTargetAction(page, subdomain, "/public/admin", "bypass");
      await waitForStatus(
        serviceDomain,
        "/public/admin/warm-actions-updated",
        200,
      );
      const beforeEditedProbe = upstream.snapshot().length;
      const edited = await requestThroughReverseProxy(
        serviceDomain,
        "/public/admin/edited-bypass",
      );
      expect(edited.status).toBe(200);
      expect(upstream.snapshot()).toHaveLength(beforeEditedProbe + 1);
      expect(parseEcho(edited).path).toBe("/edited-bypass");

      await deleteService(page, subdomain);
      const beforeDeleteConvergence = upstream.snapshot().length;
      await waitForStatus(serviceDomain, "/private", 404);
      expect(upstream.snapshot()).toHaveLength(beforeDeleteConvergence);
      const beforeDeleteProbe = upstream.snapshot().length;
      const deleted = await requestThroughReverseProxy(
        serviceDomain,
        "/public/ready",
      );
      expect(deleted.status).toBe(404);
      expect(upstream.snapshot()).toHaveLength(beforeDeleteProbe);
    } finally {
      try {
        await deleteServicesByPrefix(page, SERVICE_PREFIX);
      } finally {
        await upstream.close();
      }
    }
  });
});

async function createService(
  page: Page,
  options: {
    subdomain: string;
    upstreamHost: string;
    upstreamPort: number;
  },
  testInfo: TestInfo,
) {
  await gotoReverseProxyPage(page);
  await page.getByTestId("add-service").first().click();
  await page.getByTestId("proxy-subdomain-input").fill(options.subdomain);
  await selectProxyDomain(page, CUSTOM_PORTS_DOMAIN);

  await addClusterTarget(page, options, "/");
  await addClusterTarget(page, options, "/public");
  await addClusterTarget(page, options, "/public/admin");

  await page.getByTestId("proxy-continue").click();
  const netBirdOnly = page.getByTestId("auth-netbird-only-card");
  await expect(netBirdOnly.getByText("Enabled", { exact: true })).toBeVisible();
  await netBirdOnly.click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    netBirdOnly.getByText("Enabled", { exact: true }),
  ).not.toBeVisible();

  await page.getByTestId("auth-header-card").click();
  await page.getByTestId("header-basic-username").fill(AUTH_USER);
  await page.getByTestId("header-basic-password").fill(AUTH_PASSWORD);
  await page.getByTestId("submit-headers").click();
  await expect(
    page.getByTestId("auth-header-card").getByText("Enabled", { exact: true }),
  ).toBeVisible();

  await page.getByTestId("proxy-tab-targets").click();
  await setTargetAction(page, "/public", "Bypass authentication");
  await setTargetAction(page, "/public/admin", "Block access");
  await testInfo.attach("configured target access actions", {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  await page.getByTestId("proxy-continue").click();
  await page.getByTestId("proxy-continue").click();
  await page.getByTestId("proxy-continue").click();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/reverse-proxies/services") &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByTestId("submit-service").click();
  const response = await responsePromise;
  expect([200, 201]).toContain(response.status());
  await expect(
    page.locator("tr").filter({ hasText: options.subdomain }),
  ).toBeVisible({ timeout: 30_000 });
}

async function addClusterTarget(
  page: Page,
  options: {
    upstreamHost: string;
    upstreamPort: number;
  },
  location: string,
) {
  await page.getByTestId("add-target").click();
  await page.getByTestId("group-selector-dropdown").click();
  await page.getByRole("tab", { name: "Proxy Clusters" }).click();
  await page
    .locator("[cmdk-list]")
    .getByText(CUSTOM_PORTS_DOMAIN, { exact: true })
    .click({ force: true });

  await page
    .getByPlaceholder("e.g., 127.0.0.1 or backend.lan")
    .fill(options.upstreamHost);
  await page
    .getByTestId("target-port-input")
    .fill(String(options.upstreamPort));
  if (location !== "/") {
    await page.getByTestId("target-location-input").fill(location);
  }
  await page.getByTestId("submit-target").click();
}

async function setTargetAction(
  page: Page,
  location: string,
  action: "Bypass authentication" | "Block access",
) {
  const targets = page.getByText("HTTPS Targets").locator("..");
  await targets.getByText(location, { exact: true }).click({ force: true });
  await page.getByTestId("target-optional-settings").click();
  await page.getByTestId("target-access-action").click();
  await page.getByRole("option", { name: action }).click();
  await page.getByTestId("submit-target").click();

  const row = targets.locator("tr").filter({
    has: page.getByText(location, { exact: true }),
  });
  await expect(row.getByRole("img", { name: action })).toBeVisible();
}

async function editTargetAction(
  page: Page,
  subdomain: string,
  location: string,
  action: "bypass" | "block",
) {
  await openServiceEdit(page, subdomain);
  await setTargetAction(
    page,
    location,
    action === "bypass" ? "Bypass authentication" : "Block access",
  );

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/reverse-proxies/services/") &&
      response.request().method() === "PUT",
    { timeout: 30_000 },
  );
  await page.getByTestId("proxy-save").click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
}

async function waitForStatus(
  serviceDomain: string,
  requestPath: string,
  status: number,
  headers: Record<string, string> = {},
): Promise<ReverseProxyResponse> {
  let lastResponse: ReverseProxyResponse | undefined;
  await expect
    .poll(
      async () => {
        lastResponse = await requestThroughReverseProxy(
          serviceDomain,
          requestPath,
          headers,
        );
        return lastResponse.status;
      },
      {
        timeout: 30_000,
        intervals: [250, 500, 1_000],
        message: `${serviceDomain}${requestPath} should return ${status}`,
      },
    )
    .toBe(status);
  if (!lastResponse) throw new Error("Proxy did not return a response");
  return lastResponse;
}

function parseEcho(response: ReverseProxyResponse): EchoedRequest {
  return JSON.parse(response.body) as EchoedRequest;
}

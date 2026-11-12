/**
 * Agent Network log streaming: the Configuration > Log Streaming tab.
 *
 * Successful test deliveries go to the agentgateway-stub container that the
 * Agent Network provider specs already use, under its log-receiver.e2e.test
 * alias (the dashboard's URL check wants a dotted host name). Its /log-streaming route answers
 * 204 only for the bearer token below and 401 otherwise, so an edit that lost
 * the stored token makes the re-test fail and the save with it.
 *
 * Management builds without log streaming answer the endpoint with 404; the
 * unlocked tests skip there, so the suite stays green until the backend ships.
 *
 * Like the other agent-network specs this one opens its own context: the
 * Agent Network menu is behind a localStorage override that has to be set
 * before the first navigation.
 */
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import { getApiContext } from "../helpers/api";
import { loginToApp, navigateTo } from "../helpers/auth";
import { visitByNavigation } from "../helpers/navigation";

const ENDPOINT = "/integrations/agent-network/log-streaming";
const RECEIVER_URL = "http://log-receiver.e2e.test:8088/log-streaming";
const RECEIVER_TOKEN = "e2e-log-streaming-token";
const SIGNING_SECRET = "e2e-log-streaming-signing-secret";
// Nothing listens here, so the OTLP test delivery is refused.
const UNREACHABLE_OTLP = "agentgateway-stub:4317";

type Integration = {
  id: number;
  enabled: boolean;
  platform: "http" | "otlp_grpc";
  config: Record<string, string>;
};

async function openPage(
  browser: Browser,
  edition?: "oss",
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  try {
    await context.addInitScript((ed) => {
      try {
        window.localStorage.setItem("netbird-test-agent-network", "enabled");
        if (ed) window.localStorage.setItem("netbird-test-edition", ed);
      } catch (e) {}
    }, edition ?? "");
    const page = await context.newPage();
    await loginToApp(page, "owner");
    return { page, close: () => context.close() };
  } catch (e) {
    await context.close();
    throw e;
  }
}

async function api(page: Page, method: string, path = "", data?: unknown) {
  const { token, origin } = await getApiContext(page);
  return page.request.fetch(`${origin}/api${ENDPOINT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

async function listIntegrations(page: Page): Promise<Integration[]> {
  const resp = await api(page, "GET");
  expect(resp.status(), await resp.text()).toBe(200);
  return resp.json();
}

async function deleteAllIntegrations(page: Page) {
  for (const i of await listIntegrations(page)) {
    await api(page, "DELETE", `/${i.id}`);
  }
}

// Skips the calling test when management doesn't serve log streaming yet.
async function skipWithoutBackend(page: Page) {
  const resp = await api(page, "GET");
  test.skip(
    resp.status() === 404,
    `management answers GET /api${ENDPOINT} with 404: this build has no Agent Network log streaming`,
  );
}

// Through the sidebar, from a page outside Agent Network so its group starts
// collapsed (clicking an expanded group would collapse it).
async function openLogStreamingTab(page: Page) {
  await navigateTo(page, "/team/users");
  // The group label carries a "Beta" badge, so exact-text lookup misses it.
  await page
    .getByTestId("left-navigation-item")
    .filter({ hasText: /^Agent Network/ })
    .click();
  await visitByNavigation(page, "Configuration");
  await page.getByTestId("agent-network-tab-log-streaming").click();
}

const card = (page: Page, platform: Integration["platform"]) =>
  page.getByTestId(`log-streaming-card-${platform}`);
const cardSwitch = (c: Locator) => c.getByRole("switch");

const waitForCall = (page: Page, method: string) =>
  page.waitForResponse(
    (r) =>
      r.url().includes(`/api${ENDPOINT}`) && r.request().method() === method,
    { timeout: 60_000 },
  );

async function expectGreyedOut(c: Locator, greyed: boolean) {
  await expect(c).toHaveCSS("opacity", greyed ? "0.6" : "1");
  await expect(c).toHaveCSS("pointer-events", greyed ? "none" : "auto");
}

async function selectBearer(page: Page, token: string) {
  await page.getByTestId("webhook-auth-type").click();
  await page.locator("[cmdk-list]").getByText("Bearer Token").click();
  await page.getByTestId("webhook-bearer-token").fill(token);
}

async function createHttpViaApi(page: Page): Promise<Integration> {
  const resp = await api(page, "POST", "", {
    platform: "http",
    config: {
      url: RECEIVER_URL,
      headers: JSON.stringify({ Authorization: `Bearer ${RECEIVER_TOKEN}` }),
    },
  });
  expect([200, 201], await resp.text()).toContain(resp.status());
  return resp.json();
}

test.describe
  .serial("Agent Network log streaming @agent-network @test-build @test-env @cloud", () => {
  let page: Page;
  let close: () => Promise<void>;

  test.beforeAll(async ({ browser }) => {
    ({ page, close } = await openPage(browser));
  });
  test.afterAll(async () => {
    if (await api(page, "GET").then((r) => r.ok())) {
      await deleteAllIntegrations(page);
    }
    await close();
  });

  test("connects, edits, toggles and deletes an HTTP integration", async () => {
    await skipWithoutBackend(page);
    await deleteAllIntegrations(page);
    await openLogStreamingTab(page);

    // ---- connect ----
    const http = card(page, "http");
    await http.getByRole("button", { name: "Connect HTTP" }).click();
    await page.getByTestId("webhook-url-input").fill(RECEIVER_URL);
    await selectBearer(page, RECEIVER_TOKEN);
    await page.getByTestId("log-streaming-tab-options").click({ force: true });
    await page.getByTestId("log-streaming-signing-secret").fill(SIGNING_SECRET);
    const created = waitForCall(page, "POST");
    await page.getByTestId("log-streaming-save").click();
    const createResp = await created;
    expect([200, 201], await createResp.text()).toContain(createResp.status());

    await expect(cardSwitch(http)).toHaveAttribute("data-state", "checked");
    let [stored] = await listIntegrations(page);
    expect(stored).toMatchObject({ platform: "http", enabled: true });
    expect(stored.config.url).toBe(RECEIVER_URL);
    expect(stored.config.signing_secret).toBe("****");

    // ---- edit: secrets come back masked, and the mask keeps them ----
    await http.getByRole("button", { name: "Configuration" }).click();
    await expect(page.getByTestId("webhook-bearer-token")).toHaveValue("****");
    await page.getByTestId("log-streaming-tab-options").click({ force: true });
    await expect(page.getByTestId("log-streaming-signing-secret")).toHaveValue(
      "****",
    );
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByPlaceholder("100", { exact: true }).fill("50");
    const updated = waitForCall(page, "PUT");
    await page.getByTestId("log-streaming-save").click();
    // Saved while enabled, so management re-tested the receiver with the
    // stored token: a dropped token would have been a 401 and a 412 here.
    const update = await updated;
    expect(update.status()).toBe(200);
    const sent = update.request().postDataJSON().config;
    expect(sent.signing_secret).toBe("****");
    expect(JSON.parse(sent.headers).Authorization).toBe("Bearer ****");

    [stored] = await listIntegrations(page);
    expect(stored.config.signing_secret).toBe("****");
    expect(stored.config.batch_size).toBe("50");
    expect(JSON.parse(stored.config.headers).Authorization).toBe("Bearer ****");

    // ---- disable, re-enable ----
    let toggled = waitForCall(page, "PUT");
    await cardSwitch(http).click();
    expect((await toggled).status()).toBe(200);
    await expect(cardSwitch(http)).toHaveAttribute("data-state", "unchecked");

    toggled = waitForCall(page, "PUT");
    await cardSwitch(http).click();
    expect((await toggled).status()).toBe(200);
    await expect(cardSwitch(http)).toHaveAttribute("data-state", "checked");

    // ---- delete ----
    await http.getByRole("button", { name: "Configuration" }).click();
    await page.getByTestId("log-streaming-tab-danger").click({ force: true });
    await page.getByTestId("log-streaming-delete").click();
    const deleted = waitForCall(page, "DELETE");
    await page.getByTestId("confirmation.confirm").click({ force: true });
    expect([200, 204]).toContain((await deleted).status());
    await expect(
      http.getByRole("button", { name: "Connect HTTP" }),
    ).toBeVisible();
    expect(await listIntegrations(page)).toHaveLength(0);
  });

  test("validates the OTLP endpoint and reports a rejected test delivery", async () => {
    await skipWithoutBackend(page);
    await deleteAllIntegrations(page);
    await openLogStreamingTab(page);

    await card(page, "otlp_grpc")
      .getByRole("button", { name: "Connect OTLP/gRPC" })
      .click();
    const endpoint = page.getByTestId("log-streaming-endpoint");
    const save = page.getByTestId("log-streaming-save");

    for (const bad of [
      "http://otel-collector:4317",
      "otel-collector",
      "otel-collector:4317/v1",
    ]) {
      await endpoint.fill(bad);
      await expect(
        page.getByText("Enter host:port without a scheme"),
      ).toBeVisible();
      await expect(save).toBeDisabled();
    }

    await endpoint.fill(UNREACHABLE_OTLP);
    await expect(
      page.getByText("Enter host:port without a scheme"),
    ).toHaveCount(0);
    // A short timeout keeps the refused delivery from running to the default.
    await page.getByTestId("log-streaming-tab-options").click({ force: true });
    await page.getByRole("button", { name: "Advanced" }).click();
    await page.getByPlaceholder("30s").first().fill("3s");

    const rejected = waitForCall(page, "POST");
    await save.click();
    expect((await rejected).status()).toBe(412);
    await expect(
      page.locator("[data-toast-notification]").first(),
    ).toContainText(/unsuccessful otlp_grpc integration test/i);
    // Nothing was stored and the form stays open with the values.
    expect(await listIntegrations(page)).toHaveLength(0);
    await expect(save).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click({ force: true });
    await expect(
      card(page, "otlp_grpc").getByRole("button", {
        name: "Connect OTLP/gRPC",
      }),
    ).toBeVisible();
  });

  test("locks the other card while one integration is enabled", async () => {
    await skipWithoutBackend(page);
    await deleteAllIntegrations(page);
    await createHttpViaApi(page);
    await openLogStreamingTab(page);

    const http = card(page, "http");
    const otlp = card(page, "otlp_grpc");
    await expect(cardSwitch(http)).toHaveAttribute("data-state", "checked");
    await expectGreyedOut(http, false);
    await expectGreyedOut(otlp, true);

    const disabled = waitForCall(page, "PUT");
    await cardSwitch(http).click();
    expect((await disabled).status()).toBe(200);
    await expect(cardSwitch(http)).toHaveAttribute("data-state", "unchecked");
    await expectGreyedOut(otlp, false);
  });
});

test.describe("Agent Network log streaming, locked @agent-network @test-build", () => {
  test("an unlicensed server shows the license card and never calls the endpoint", async ({
    browser,
  }) => {
    const { page, close } = await openPage(browser, "oss");
    try {
      const calls: string[] = [];
      page.on("request", (r) => {
        if (r.url().includes(`/api${ENDPOINT}`)) calls.push(r.url());
      });
      await openLogStreamingTab(page);

      await expect(
        page.getByTestId("self-hosted-upgrade-cta").first(),
      ).toBeVisible();
      await expect(page.getByText("Log Streaming is available")).toBeVisible();
      for (const platform of ["http", "otlp_grpc"] as const) {
        await expectGreyedOut(card(page, platform), true);
      }
      // A click lands on nothing: no setup modal opens.
      await card(page, "http")
        .getByRole("button", { name: "Connect HTTP" })
        .click({ force: true });
      await expect(page.getByTestId("log-streaming-save")).toHaveCount(0);

      expect(calls, calls.join("\n")).toHaveLength(0);
    } finally {
      await close();
    }
  });
});

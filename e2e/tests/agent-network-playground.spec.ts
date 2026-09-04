import {
  type Browser,
  expect,
  type Page,
  type Route,
  test,
} from "@playwright/test";
import { loginToApp } from "../helpers/auth";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const ALLOW = { create: true, read: true, update: true, delete: true };
const DENY = { create: false, read: false, update: false, delete: false };
const SETTINGS = {
  endpoint: "violet.proxy.example.com",
  proxy_address: "proxy.example.com",
  dedicated: false,
  enable_log_collection: true,
  enable_prompt_collection: false,
  redact_pii: false,
  access_log_retention_days: 30,
};

const ALICE = {
  id: "user-alice",
  email: "alice@example.com",
  name: "Alice",
  role: "user",
  status: "active",
  auto_groups: ["group-engineering"],
  permissions: { is_restricted: false, modules: {} },
};
const BOB = {
  ...ALICE,
  id: "user-bob",
  email: "bob@example.com",
  name: "Bob",
  auto_groups: [],
};

function currentUser(peerRead = true, groupRead = true) {
  return {
    ...ALICE,
    id: "owner-1",
    email: "owner@example.com",
    name: "Owner",
    role: "owner",
    is_current: true,
    permissions: {
      is_restricted: false,
      modules: {
        services: ALLOW,
        "agent_network.providers": ALLOW,
        peers: peerRead ? ALLOW : DENY,
        users: peerRead ? ALLOW : DENY,
        groups: groupRead ? ALLOW : DENY,
      },
    },
  };
}

async function fulfillJSON(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockPlaygroundDependencies(
  page: Page,
  opts: { peerRead?: boolean; groupRead?: boolean } = {},
) {
  await page.route("**/api/users/current**", (route) =>
    fulfillJSON(route, currentUser(opts.peerRead, opts.groupRead)),
  );
  await page.route("**/api/users?**", (route) => {
    const serviceUser = new URL(route.request().url()).searchParams.get(
      "service_user",
    );
    return fulfillJSON(route, serviceUser === "true" ? [] : [ALICE, BOB]);
  });
  await page.route("**/api/peers**", (route) =>
    fulfillJSON(route, [
      {
        id: "peer-alice",
        name: "Alice Laptop",
        hostname: "alice-laptop",
        ip: "100.64.0.10",
        user_id: ALICE.id,
      },
      {
        id: "peer-bob",
        name: "Bob Laptop",
        hostname: "bob-laptop",
        ip: "100.64.0.11",
        user_id: BOB.id,
      },
    ]),
  );
  await page.route("**/api/groups**", (route) =>
    fulfillJSON(route, [
      { id: "group-engineering", name: "Engineering", peers: [] },
      { id: "group-sales", name: "Sales", peers: [] },
    ]),
  );
  await page.route("**/api/agent-network/settings**", (route) =>
    fulfillJSON(route, SETTINGS),
  );
  for (const path of ["providers", "policies", "guardrails", "budget-rules"]) {
    await page.route(`**/api/agent-network/${path}**`, (route) =>
      fulfillJSON(route, []),
    );
  }
}

async function openPlayground(
  browser: Browser,
  opts: { peerRead?: boolean; groupRead?: boolean } = {},
) {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript(
    ([key, value]) =>
      window.localStorage.setItem(key as string, value as string),
    [AGENT_NETWORK_CONFIG_KEY, "enabled"],
  );
  const page = await context.newPage();
  await mockPlaygroundDependencies(page, opts);
  await loginToApp(page, "owner");
  await page.goto("/agent-network/playground");
  return { page, close: () => context.close() };
}

async function selectAlicePeer(page: Page) {
  await page.getByRole("button", { name: "Select a user..." }).click();
  await page.getByText("Alice", { exact: true }).click();
  const peerSelect = page.getByRole("combobox", { name: "Peer" });
  await peerSelect.click();
  const alicePeer = page.getByRole("option", { name: /Alice Laptop/ });
  await expect(alicePeer).toBeVisible();
  await expect(page.getByRole("option", { name: /Bob Laptop/ })).toHaveCount(0);
  await alicePeer.click();
}

test.describe("Agent Network playground @agent-network", () => {
  test("runs peer and synthetic group requests with raw result states", async ({
    browser,
  }) => {
    const { page, close } = await openPlayground(browser);
    const requests: unknown[] = [];
    let call = 0;
    await page.route("**/api/agent-network/playground", async (route) => {
      requests.push(route.request().postDataJSON());
      call += 1;
      if (call === 1) {
        return fulfillJSON(route, {
          status_code: 200,
          headers: [
            { name: "Content-Type", values: ["text/event-stream"] },
            { name: "X-Test", values: ["one", "two"] },
          ],
          body: 'data: {"delta":"pong"}\n\n',
          body_encoding: "utf8",
          body_truncated: true,
          identity: {
            user_id: ALICE.id,
            user_email: ALICE.email,
            group_ids: ["group-engineering"],
            group_names: ["Engineering"],
          },
          policy: {
            decision: "allow",
            reason: "",
            provider_surface: "openai",
            model: "gpt-4o",
            resolved_provider_id: "provider-1",
            authorising_group_ids: ["group-engineering"],
            selected_policy_id: "policy-1",
            attribution_group_id: "group-engineering",
          },
        });
      }
      return fulfillJSON(route, {
        status_code: 403,
        headers: [{ name: "Content-Type", values: ["application/json"] }],
        body: "/wA=",
        body_encoding: "base64",
        body_truncated: false,
        identity: {
          user_id: "",
          user_email: "",
          group_ids: ["group-sales"],
          group_names: ["Sales"],
        },
        policy: {
          decision: "deny",
          reason: "no_authorised_provider",
          provider_surface: "openai",
          model: "gpt-4o",
          resolved_provider_id: "",
          authorising_group_ids: [],
          selected_policy_id: "",
          attribution_group_id: "",
        },
      });
    });

    try {
      await expect(
        page.getByRole("heading", { level: 1, name: "Playground" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "This sends a real provider request. It can incur cost and updates usage, budgets, and access logs for the emulated identity.",
        ),
      ).toBeVisible();
      await selectAlicePeer(page);
      await page.getByRole("button", { name: "Run live request" }).click();
      const response = page.getByRole("region", {
        name: "Response inspector",
      });
      await expect(response.getByText("HTTP 200")).toBeVisible();
      await expect(response).toContainText('data: {"delta":"pong"}');
      await expect(response.getByText(/Response exceeded 8 MiB/)).toBeVisible();
      expect(requests[0]).toMatchObject({
        principal: { kind: "peer", id: "peer-alice" },
      });

      await response.getByRole("tab", { name: /Headers/i }).click();
      await expect(
        response.getByText("Content-Type", { exact: true }),
      ).toBeVisible();
      await expect(response.getByText("one", { exact: true })).toBeVisible();
      await expect(response.getByText("two", { exact: true })).toBeVisible();

      await response.getByRole("tab", { name: /Details/i }).click();
      await expect(
        response.getByText(ALICE.email, { exact: true }),
      ).toBeVisible();
      await expect(
        response.getByText("Engineering (group-engineering)", { exact: true }),
      ).toBeVisible();
      await expect(
        response.getByText("provider-1", { exact: true }),
      ).toBeVisible();
      await expect(
        response.getByText("policy-1", { exact: true }),
      ).toBeVisible();

      await page.getByRole("radio", { name: /Synthetic group/ }).click();
      await page.getByRole("button", { name: "Select a group..." }).click();
      await page.getByText("Sales", { exact: true }).click();
      await expect(
        page.getByText(
          "Synthetic group identity: per-user limits do not apply.",
        ),
      ).toBeVisible();
      await page.getByRole("button", { name: "Run live request" }).click();
      await expect(response.getByText("HTTP 403")).toBeVisible();
      await response.getByRole("tab", { name: /Body/i }).click();
      const bodyPanel = response.getByRole("tabpanel", { name: /Body/i });
      await expect(bodyPanel.getByText("base64")).toBeVisible();
      await expect(bodyPanel.getByText("/wA=")).toBeVisible();
      expect(requests[1]).toMatchObject({
        principal: { kind: "group", id: "group-sales" },
      });
    } finally {
      await close();
    }
  });

  test("blocks protected headers and cancels an in-flight request", async ({
    browser,
  }) => {
    const { page, close } = await openPlayground(browser);
    await page.route("**/api/agent-network/playground", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      return fulfillJSON(route, {});
    });
    try {
      await selectAlicePeer(page);
      const headerName = page.getByLabel("Header 1 name");
      await headerName.fill("Authorization");
      await expect(page.getByText(/managed by NetBird/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Run live request" }),
      ).toBeDisabled();

      await headerName.fill("Content-Type");
      await page.getByRole("button", { name: "Run live request" }).click();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
      await expect(
        page.getByRole("region", { name: "Response inspector" }),
      ).not.toContainText("Request failed");
    } finally {
      await close();
    }
  });

  test("shows management failures with their request ID", async ({
    browser,
  }) => {
    const { page, close } = await openPlayground(browser);
    await page.route("**/api/agent-network/playground", (route) =>
      route.fulfill({
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "request-503",
          "Access-Control-Expose-Headers": "X-Request-Id",
        },
        body: JSON.stringify({
          code: 503,
          message: "No playground-capable proxy is connected.",
        }),
      }),
    );

    try {
      await selectAlicePeer(page);
      await page.getByRole("button", { name: "Run live request" }).click();

      const response = page.getByRole("region", {
        name: "Response inspector",
      });
      await expect(response.getByRole("alert")).toContainText(
        "No playground-capable proxy is connected.",
      );
      await expect(response.getByRole("alert")).toContainText(
        "Request ID: request-503",
      );
      await expect(response).not.toContainText("HTTP 503");
    } finally {
      await close();
    }
  });

  test("keeps the request and response workspace responsive", async ({
    browser,
  }) => {
    const { page, close } = await openPlayground(browser);

    try {
      const request = page.getByRole("region", { name: "Request builder" });
      const response = page.getByRole("region", {
        name: "Response inspector",
      });

      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect(request).toBeVisible();
      await expect(response).toBeVisible();
      const desktopRequest = await request.boundingBox();
      const desktopResponse = await response.boundingBox();
      expect(desktopRequest).not.toBeNull();
      expect(desktopResponse).not.toBeNull();
      expect(Math.abs(desktopRequest!.y - desktopResponse!.y)).toBeLessThan(4);
      expect(desktopResponse!.x).toBeGreaterThanOrEqual(
        desktopRequest!.x + desktopRequest!.width,
      );

      await page.setViewportSize({ width: 1024, height: 900 });
      const narrowRequest = await request.boundingBox();
      const narrowResponse = await response.boundingBox();
      expect(narrowRequest).not.toBeNull();
      expect(narrowResponse).not.toBeNull();
      expect(narrowResponse!.y).toBeGreaterThanOrEqual(
        narrowRequest!.y + narrowRequest!.height,
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth ===
            document.documentElement.clientWidth,
        ),
      ).toBe(true);

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole("heading", { level: 1, name: "Playground" }),
      ).toBeVisible();
      await expect(
        request.getByRole("button", { name: "Run live request" }),
      ).toBeVisible();
      await expect(request).toBeVisible();
      await expect(response).toBeVisible();
      const mobileRequest = await request.boundingBox();
      const mobileResponse = await response.boundingBox();
      expect(mobileRequest).not.toBeNull();
      expect(mobileResponse).not.toBeNull();
      expect(mobileResponse!.y).toBeGreaterThanOrEqual(
        mobileRequest!.y + mobileRequest!.height,
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth ===
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  test("disables only the principal mode without read permission", async ({
    browser,
  }) => {
    const { page, close } = await openPlayground(browser, {
      peerRead: false,
      groupRead: true,
    });
    try {
      await expect(
        page.getByRole("radio", { name: /Peer-backed user/ }),
      ).toBeDisabled();
      await expect(
        page.getByRole("radio", { name: /Synthetic group/ }),
      ).toBeEnabled();
    } finally {
      await close();
    }
  });
});

/**
 * Setup project for a deployed target (`NETBIRD_E2E_BASE_URL`), replacing
 * `login.spec.ts`, which drives the local Zitadel.
 *
 * The specs assume a near-fresh account, but a deployed instance may carry
 * objects from whatever ran against it before (the pre-release network
 * scenarios share one control plane with this suite). So this resets the
 * account to the fresh-account invariants before saving the owner session.
 * Only point the suite at a disposable instance: the reset deletes every
 * policy, route, network, setup key, peer, nameserver group and group.
 */
import { test, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { getApiContext } from "../helpers/api";
import { loginToApp } from "../helpers/auth";

const AUTH_DIR = path.resolve(__dirname, "../fixtures/auth");

type Api = { token: string; origin: string };

/**
 * Failures are logged, not thrown: an endpoint a server does not expose or an
 * undeletable built-in object must not fail the suite. Leftovers surface in
 * the specs they actually affect.
 */
async function deleteCollection(
  page: Page,
  api: Api,
  collection: string,
  keep: (item: { id: string; name?: string }) => boolean = () => false,
) {
  const headers = { Authorization: `Bearer ${api.token}` };
  const list = await page.request.get(`${api.origin}/api${collection}`, {
    headers,
  });
  if (!list.ok()) {
    console.warn(
      `[setup] skipping ${collection}: GET returned ${list.status()}`,
    );
    return;
  }
  const items = (await list.json()) as { id: string; name?: string }[];
  for (const item of items) {
    if (keep(item)) continue;
    const del = await page.request.delete(
      `${api.origin}/api${collection}/${item.id}`,
      { headers },
    );
    if (!del.ok()) {
      console.warn(
        `[setup] could not delete ${collection}/${item.id} (${
          item.name ?? "unnamed"
        }): ${del.status()}`,
      );
    }
  }
}

// A pending onboarding flag renders a full-screen dialog that intercepts every
// click; clear it the way the dashboard's own skip button does.
async function completeOnboarding(page: Page, api: Api) {
  const headers = { Authorization: `Bearer ${api.token}` };
  const resp = await page.request.get(`${api.origin}/api/accounts`, {
    headers,
  });
  if (!resp.ok()) return;
  const [account] = (await resp.json()) as {
    id: string;
    onboarding?: Record<string, unknown>;
  }[];
  if (!account) return;
  const update = await page.request.put(
    `${api.origin}/api/accounts/${account.id}`,
    {
      headers,
      data: {
        ...account,
        onboarding: {
          ...account.onboarding,
          onboarding_flow_pending: false,
          signup_form_pending: false,
        },
      },
    },
  );
  if (!update.ok()) {
    console.warn(
      `[setup] could not clear onboarding flags: ${update.status()}`,
    );
  }
}

// Management creates this policy with every new account, and specs assert it.
async function restoreDefaultPolicy(page: Page, api: Api) {
  const headers = { Authorization: `Bearer ${api.token}` };
  const resp = await page.request.get(`${api.origin}/api/groups`, { headers });
  if (!resp.ok()) {
    console.warn(`[setup] could not list groups: ${resp.status()}`);
    return;
  }
  const groups = (await resp.json()) as { id: string; name: string }[];
  const all = groups.find((g) => g.name === "All");
  if (!all) return;
  const rule = {
    name: "Default",
    description:
      "This is a default rule that allows connections between all the resources",
    enabled: true,
    sources: [all.id],
    destinations: [all.id],
    bidirectional: true,
    protocol: "all",
    action: "accept",
  };
  const create = await page.request.post(`${api.origin}/api/policies`, {
    headers,
    data: { ...rule, rules: [rule] },
  });
  if (!create.ok()) {
    console.warn(
      `[setup] could not restore the Default policy: ${create.status()}`,
    );
  }
}

// App-vs-spec version skew is the most common cause of failures against a
// deployed target, so put the deployed versions next to the results.
async function logDeployedVersions(page: Page) {
  try {
    const versionOf = (label: string) =>
      page
        .locator(`span:text-is("${label}") + span`)
        .first()
        .innerText({ timeout: 10_000 });
    console.log(
      `[setup] deployed versions: management ${await versionOf(
        "Management",
      )}, dashboard ${await versionOf("Dashboard")}`,
    );
  } catch {
    console.warn(
      "[setup] could not read deployed versions from the nav footer",
    );
  }
}

test.describe("Deployed Setup", () => {
  test("reset account and save auth state", async ({ page }) => {
    await loginToApp(page, "owner");
    const api = await getApiContext(page);
    await logDeployedVersions(page);

    // Policies and routes reference groups, so they go first.
    await deleteCollection(page, api, "/policies");
    await deleteCollection(page, api, "/routes");
    await deleteCollection(page, api, "/networks");
    await deleteCollection(page, api, "/setup-keys");
    await deleteCollection(page, api, "/peers");
    await deleteCollection(page, api, "/dns/nameservers");
    await deleteCollection(page, api, "/groups", (g) => g.name === "All");
    await completeOnboarding(page, api);
    await restoreDefaultPolicy(page, api);

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    // No user.json: every spec that logs in as `user` is tagged @test-env, and
    // one that is not fails on the missing file instead of running as owner.
    await page
      .context()
      .storageState({ path: path.join(AUTH_DIR, "owner.json") });
  });
});

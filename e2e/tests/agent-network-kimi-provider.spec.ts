/**
 * Agent Network Kimi (Moonshot AI) provider spec.
 *
 * Walks the Kimi provider lifecycle end to end against the real backend:
 * pick kimi_api from the catalog (prefilled host, catalog models with
 * pricing), connect it, then verify the Kimi-gated config surfaces on the
 * Connect Agent page (Kimi CLI tab, Kimi backend option in the Claude Code
 * tab) that only render when a Kimi provider is connected.
 *
 * The kimi_api catalog entry ships with newer management builds. When the
 * backend under test predates it, the whole suite skips instead of failing —
 * same trade-off as the provider matrix in netbird's agent-network e2e
 * harness, which skips per-provider on missing credentials. The same applies
 * to the explicit settings bootstrap: connecting the first provider of an
 * account POSTs /agent-network/settings first, so on a build without that
 * endpoint the wizard cannot get as far as creating a provider.
 *
 * The Agent Network menu is deployment-gated; the test build honors the
 * localStorage override (see testAgentNetworkOverride in utils/netbird.ts),
 * set via addInitScript on a dedicated context below.
 */
import { type Browser, expect, type Page,test } from "@playwright/test";
import {
  createAgentNetworkPolicy,
  createGroup,
  deleteAgentNetworkPoliciesByPrefix,
  deleteAgentNetworkProvidersByPrefix,
  deleteGroup,
  getCurrentUser,
  listAgentNetworkCatalog,
  listGroups,
  supportsAgentNetworkAgentConfig,
  supportsAgentNetworkSettingsBootstrap,
  updateUserAutoGroups,
} from "../helpers/api";
import { loginToApp } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const KIMI_CATALOG_ID = "kimi_api";
const KIMI_CATALOG_NAME = "Kimi (Moonshot AI) API";
const PROVIDER_PREFIX = "e2e-kimi-";

/**
 * Remove every fixture this spec creates: the policy granting the caller the
 * provider, the group carrying that grant (detached from the caller first —
 * a group referenced by a user's auto-groups refuses deletion), and the
 * provider itself. Runs before the test too, so leftovers from an interrupted
 * run never poison the next one.
 */
async function cleanupKimiFixtures(page: Page) {
  await deleteAgentNetworkPoliciesByPrefix(page, PROVIDER_PREFIX);
  const fixtureGroups = (await listGroups(page)).filter((g) =>
    g.name.startsWith(PROVIDER_PREFIX),
  );
  if (fixtureGroups.length > 0) {
    const fixtureGroupIds = new Set(fixtureGroups.map((g) => g.id));
    const caller = await getCurrentUser(page);
    if ((caller.auto_groups ?? []).some((id) => fixtureGroupIds.has(id))) {
      await updateUserAutoGroups(
        page,
        caller,
        (caller.auto_groups ?? []).filter((id) => !fixtureGroupIds.has(id)),
      );
    }
    for (const g of fixtureGroups) {
      await deleteGroup(page, g.id);
    }
  }
  await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);
}

async function newAgentNetworkPage(browser: Browser): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const context = await browser.newContext({
    storageState: "e2e/fixtures/auth/owner.json",
  });
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch (e) {}
    },
    [AGENT_NETWORK_CONFIG_KEY, "enabled"],
  );
  const page = await context.newPage();
  await loginToApp(page, "owner");
  return { page, close: () => context.close() };
}

test.describe.serial("Agent Network Kimi provider @agent-network", () => {
  test("connect a Kimi provider and see Kimi agent configs", async ({
    browser,
  }) => {
    const { page, close } = await newAgentNetworkPage(browser);
    try {
      // Backend support probe: skip the suite on management builds whose
      // catalog predates kimi_api.
      const catalog = await listAgentNetworkCatalog(page);
      test.skip(
        !catalog.some((c) => c.id === KIMI_CATALOG_ID),
        `management catalog has no ${KIMI_CATALOG_ID} entry`,
      );
      test.skip(
        !(await supportsAgentNetworkSettingsBootstrap(page)),
        "management build has no POST /agent-network/settings, so the " +
          "wizard cannot bootstrap the account before the first create",
      );
      // The Kimi-gated config surfaces live on the Connect Agent page, whose
      // caller-scoped GET /agent-network/agent-config answer ships with
      // newer management builds. The suite starts running once the backend
      // under test carries it.
      test.skip(
        !(await supportsAgentNetworkAgentConfig(page)),
        "management build has no GET /agent-network/agent-config, so the " +
          "Connect Agent page cannot render the agent config",
      );

      await cleanupKimiFixtures(page);

      await page.goto("/agent-network/providers");
      await page.keyboard.press("Escape");

      // ---- connect the provider ----
      await page
        .getByRole("button", { name: "Connect Provider" })
        .first()
        .click({ force: true });

      // The provider select defaults to OpenAI API; search the catalog for
      // the Kimi entry.
      await page
        .getByRole("button", { name: /OpenAI API/ })
        .first()
        .click({ force: true });
      await page.getByPlaceholder("Search providers...").fill("kimi");
      await page.getByText(KIMI_CATALOG_NAME).first().click({ force: true });

      // Catalog default host lands in the upstream URL input.
      await expect(
        page.locator('input[value="https://api.moonshot.ai"]'),
      ).toBeVisible();

      await page
        .getByPlaceholder("sk-...")
        .first()
        .fill("sk-e2e-kimi-test-key");

      const providerName = generateRandomName(PROVIDER_PREFIX);
      const nameInput = page.locator(`input[value="${KIMI_CATALOG_NAME}"]`);
      await nameInput.fill(providerName);

      // ---- models tab: catalog models carry pricing ----
      await page.getByRole("tab", { name: "Models" }).click({ force: true });
      await page.getByRole("button", { name: "Add More" }).click({ force: true });
      await page.getByText("Kimi K3", { exact: false }).first().click({ force: true });
      // Catalog price for kimi-k3 input tokens pre-fills the price cell.
      await expect(page.locator('input[value="0.003"]')).toBeVisible();

      const createResponse = page.waitForResponse(
        (resp) =>
          resp.url().includes("/agent-network/providers") &&
          resp.request().method() === "POST",
        { timeout: 30_000 },
      );
      // On the account's first provider the wizard bootstraps the settings row
      // first and only creates the provider once that succeeds. A rejected
      // bootstrap therefore means no provider POST ever happens, which on its
      // own surfaces only as the whole test timing out — race it so the real
      // status is reported instead. 409 is not a rejection: it means a
      // concurrent bootstrap won and the row exists, which the wizard treats as
      // success and follows with the provider create, so matching it here would
      // fail a run that is about to succeed.
      const bootstrapRejected: Promise<never> = page
        .waitForResponse(
          (resp) =>
            resp.url().includes("/agent-network/settings") &&
            resp.request().method() === "POST" &&
            resp.status() !== 409 &&
            !resp.ok(),
          { timeout: 30_000 },
        )
        .then(
          (resp) => {
            throw new Error(
              `Agent Network settings bootstrap POST returned ${resp.status()}; ` +
                "the provider was never created",
            );
          },
          // Nothing matched: the bootstrap succeeded or wasn't needed. Never
          // settle, leaving the race to the provider create.
          () => new Promise<never>(() => {}),
        );
      await page
        .getByRole("button", { name: "Connect Provider" })
        .last()
        .click({ force: true });
      const created = await Promise.race([createResponse, bootstrapRejected]);
      expect([200, 201]).toContain(created.status());
      const createdProvider = (await created.json()) as { id: string };

      // Row lands in the providers table.
      await expect(page.getByText(providerName).first()).toBeVisible();

      // ---- Kimi-gated agent config surfaces ----
      // The agent config lives inline on the Connect Agent page — the
      // providers page keeps only the endpoint URL and Copy. That page's
      // answer is caller-scoped: it offers only providers the caller's own
      // policies authorize, so grant the caller the new provider through a
      // dedicated group + policy (removed again by cleanupKimiFixtures).
      const caller = await getCurrentUser(page);
      const grantGroup = await createGroup(page, `${PROVIDER_PREFIX}grant`);
      await updateUserAutoGroups(page, caller, [
        ...(caller.auto_groups ?? []),
        grantGroup.id,
      ]);
      await createAgentNetworkPolicy(page, {
        name: `${PROVIDER_PREFIX}policy`,
        source_groups: [grantGroup.id],
        destination_provider_ids: [createdProvider.id],
      });

      await page.goto("/agent-network/connect");

      // Kimi CLI tab only renders when a kimi_api provider is connected. The
      // longer timeout covers the page's caller-scoped agent-config fetch.
      await expect(page.getByRole("tab", { name: "Kimi CLI" })).toBeVisible({
        timeout: 15_000,
      });

      // Claude Code tab's backend dropdown offers (and, with Kimi as the only
      // Anthropic-shaped provider, pre-selects) Kimi — its settings.json
      // snippet pins every model slot to kimi-k3 and disables tool search,
      // per Moonshot's Claude Code guide.
      await expect(page.getByText('"ANTHROPIC_MODEL": "kimi-k3"')).toBeVisible();
      await expect(
        page.getByText('"CLAUDE_CODE_SUBAGENT_MODEL": "kimi-k3"'),
      ).toBeVisible();
      await expect(
        page.getByText('"ENABLE_TOOL_SEARCH": "false"'),
      ).toBeVisible();
      // The base URL carries the /anthropic shape prefix that rides through
      // the endpoint to Moonshot's Anthropic surface.
      await expect(
        page.getByText(/"ANTHROPIC_BASE_URL": "https:\/\/[^"]+\/anthropic"/),
      ).toBeVisible();

      // Kimi CLI tab carries the ~/.kimi/config.toml provider block.
      await page.getByRole("tab", { name: "Kimi CLI" }).click({ force: true });
      await expect(page.getByText('default_model = "kimi-k3"')).toBeVisible();

      // Codex has no Kimi variant — Kimi's upstream doesn't support Codex, so
      // the tab keeps the plain Responses-API config with no backend dropdown.
      await page.getByRole("tab", { name: "Codex" }).click({ force: true });
      await expect(page.getByText('wire_api = "responses"')).toBeVisible();
      await expect(page.getByText('wire_api = "chat"')).not.toBeVisible();

      // ---- cleanup ----
      await cleanupKimiFixtures(page);
    } finally {
      await close();
    }
  });
});

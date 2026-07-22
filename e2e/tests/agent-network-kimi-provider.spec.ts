/**
 * Agent Network Kimi (Moonshot AI) provider spec.
 *
 * Walks the Kimi provider lifecycle end to end against the real backend:
 * pick kimi_api from the catalog (prefilled host, catalog models with
 * pricing), connect it, then verify the Kimi-gated config surfaces in the
 * "Configure Your Agent" modal (Kimi CLI tab, Kimi backend option in the
 * Claude Code tab) that only render when a Kimi provider is connected.
 *
 * The kimi_api catalog entry ships with newer management builds. When the
 * backend under test predates it, the whole suite skips instead of failing —
 * same trade-off as the provider matrix in netbird's agent-network e2e
 * harness, which skips per-provider on missing credentials.
 *
 * The Agent Network menu is deployment-gated; the test build honors the
 * localStorage override (see testAgentNetworkOverride in utils/netbird.ts),
 * set via addInitScript on a dedicated context below.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { loginToApp } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";
import {
  deleteAgentNetworkProvidersByPrefix,
  listAgentNetworkCatalog,
} from "../helpers/api";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const KIMI_CATALOG_ID = "kimi_api";
const KIMI_CATALOG_NAME = "Kimi (Moonshot AI) API";
const PROVIDER_PREFIX = "e2e-kimi-";

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

      await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);

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
      await page
        .getByRole("button", { name: "Connect Provider" })
        .last()
        .click({ force: true });
      expect([200, 201]).toContain((await createResponse).status());

      // Row lands in the providers table.
      await expect(page.getByText(providerName).first()).toBeVisible();

      // ---- Kimi-gated agent config surfaces ----
      await page
        .getByRole("button", { name: "Agent Config" })
        .click({ force: true });

      // Kimi CLI tab only renders when a kimi_api provider is connected.
      await expect(page.getByRole("tab", { name: "Kimi CLI" })).toBeVisible();

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

      // Kimi CLI tab carries the ~/.kimi/config.toml provider block.
      await page.getByRole("tab", { name: "Kimi CLI" }).click({ force: true });
      await expect(page.getByText('default_model = "kimi-k3"')).toBeVisible();

      // Codex has no Kimi variant — Kimi's upstream doesn't support Codex, so
      // the tab keeps the plain Responses-API config with no backend dropdown.
      await page.getByRole("tab", { name: "Codex" }).click({ force: true });
      await expect(page.getByText('wire_api = "responses"')).toBeVisible();
      await expect(page.getByText('wire_api = "chat"')).not.toBeVisible();

      await page.keyboard.press("Escape");

      // ---- cleanup ----
      await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);
    } finally {
      await close();
    }
  });
});

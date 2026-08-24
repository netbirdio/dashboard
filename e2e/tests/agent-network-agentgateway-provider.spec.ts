/**
 * Agent Network agentgateway provider spec.
 *
 * Exercises the catalog-driven provider flow against a management build that
 * includes the agentgateway catalog entry. Older builds skip the test.
 */
import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  deleteAgentNetworkProvidersByPrefix,
  listAgentNetworkCatalog,
  supportsAgentNetworkSettingsBootstrap,
} from "../helpers/api";
import { loginToApp } from "../helpers/auth";
import { generateRandomName } from "../helpers/utils";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const AGENTGATEWAY_CATALOG_ID = "agentgateway";
const PROVIDER_PREFIX = "e2e-agentgateway-";

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

test.describe
  .serial("Agent Network agentgateway provider @agent-network", () => {
  test("connect agentgateway with its trusted identity mapping", async ({
    browser,
  }) => {
    const { page, close } = await newAgentNetworkPage(browser);
    try {
      const catalog = await listAgentNetworkCatalog(page);
      test.skip(
        !catalog.some((entry) => entry.id === AGENTGATEWAY_CATALOG_ID),
        `management catalog has no ${AGENTGATEWAY_CATALOG_ID} entry`,
      );
      test.skip(
        !(await supportsAgentNetworkSettingsBootstrap(page)),
        "management build does not support Agent Network settings bootstrap",
      );

      await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);
      await page.goto("/agent-network/providers");
      await page.keyboard.press("Escape");

      await page
        .getByRole("button", { name: "Connect Provider" })
        .first()
        .click({ force: true });
      await page
        .getByRole("button", { name: /OpenAI API/ })
        .first()
        .click({ force: true });
      await page
        .getByPlaceholder("Search providers...")
        .fill(AGENTGATEWAY_CATALOG_ID);
      await page
        .getByText(AGENTGATEWAY_CATALOG_ID, { exact: true })
        .first()
        .click({ force: true });

      const upstreamURL = "https://agentgateway.e2e.example";
      await page
        .getByPlaceholder("https://your-agentgateway-proxy")
        .fill(upstreamURL);
      await page
        .getByPlaceholder("Paste the virtual API key")
        .fill("e2e-agentgateway-virtual-key");

      const providerName = generateRandomName(PROVIDER_PREFIX);
      await page.locator('input[value="agentgateway"]').fill(providerName);

      await page.getByRole("tab", { name: "Models" }).click({ force: true });
      await expect(page.getByText(/Empty = all catalog models/)).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page.getByRole("tab", { name: "Mappings" })).toHaveAttribute(
        "data-state",
        "active",
      );
      await expect(page.getByText("x-netbird-user-id")).toBeVisible();
      await expect(page.getByText("x-netbird-groups")).toBeVisible();
      await expect(
        page.getByText("User identity", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Authorizing groups (CSV)", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          /must not be used as an agentgateway authorization claim/,
        ),
      ).toBeVisible();

      const createResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/agent-network/providers") &&
          response.request().method() === "POST",
        { timeout: 30_000 },
      );
      await page
        .getByRole("button", { name: "Connect Provider" })
        .last()
        .click({ force: true });
      const created = await createResponse;
      expect([200, 201]).toContain(created.status());

      const body = created.request().postDataJSON();
      expect(body).toMatchObject({
        provider_id: AGENTGATEWAY_CATALOG_ID,
        name: providerName,
        upstream_url: upstreamURL,
        models: [],
        metadata_disabled: false,
      });
      expect(body).not.toHaveProperty("identity_header_user_id");
      expect(body).not.toHaveProperty("identity_header_groups");

      await expect(page.getByText(providerName).first()).toBeVisible();
      await expect(page.getByText("All models").first()).toBeVisible();

      await page.getByText(providerName).first().click({ force: true });
      await expect(
        page.getByText("Edit Provider", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(`input[value="${upstreamURL}"]`)).toBeVisible();
      await page.getByRole("tab", { name: "Mappings" }).click({ force: true });
      await expect(page.getByText("x-netbird-user-id")).toBeVisible();
      await expect(page.getByText("x-netbird-groups")).toBeVisible();
      await page.keyboard.press("Escape");

      await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);
    } finally {
      await close();
    }
  });
});

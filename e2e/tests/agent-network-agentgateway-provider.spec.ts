/**
 * Agent Network agentgateway provider spec.
 *
 * Exercises the catalog-driven provider flow against a management build that
 * includes the agentgateway catalog entry. Older builds skip the test.
 */
import {
  deleteAgentNetworkProvidersByPrefix,
  listAgentNetworkCatalog,
  supportsAgentNetworkSettingsBootstrap,
} from "../helpers/api";
import { navigateTo } from "../helpers/auth";
import { expect, test } from "../helpers/fixtures";
import { generateRandomName } from "../helpers/utils";

const AGENT_NETWORK_CONFIG_KEY = "netbird-test-agent-network";
const AGENTGATEWAY_CATALOG_ID = "agentgateway";
const PROVIDER_PREFIX = "e2e-agentgateway-";

test.describe
  .serial("Agent Network agentgateway provider @agent-network", () => {
  test("connect agentgateway with its trusted identity mapping", async ({
    dashboardAsOwner: page,
  }) => {
    await page.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key as string, value as string);
        } catch {}
      },
      [AGENT_NETWORK_CONFIG_KEY, "enabled"],
    );

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
    try {
      await navigateTo(page, "/agent-network/providers");

      await page
        .getByTestId("connect-agent-network-provider")
        .first()
        .click({ force: true });
      await page
        .getByTestId("agent-network-provider-type")
        .click({ force: true });
      await page
        .getByTestId("select-dropdown-search")
        .fill(AGENTGATEWAY_CATALOG_ID);
      await page
        .getByTestId("agent-network-provider-option-agentgateway")
        .click({ force: true });

      // Saving a provider makes management call the upstream, and it refuses
      // the save with a 422 unless the upstream answers a model listing — so a
      // made-up host cannot be used here. agentgateway is self-hosted and has
      // no public endpoint to point at, so create-test-env.sh runs a stub that
      // answers that probe inside the compose network.
      const upstreamURL = "http://agentgateway-stub:8088";
      await page
        .getByTestId("agent-network-provider-upstream-url")
        .fill(upstreamURL);
      await page
        .getByTestId("agent-network-provider-api-key")
        .fill("e2e-agentgateway-virtual-key");

      const providerName = generateRandomName(PROVIDER_PREFIX);
      await page.getByTestId("agent-network-provider-name").fill(providerName);

      await page
        .getByTestId("agent-network-provider-models-tab")
        .click({ force: true });
      await expect(
        page.getByTestId("agent-network-provider-models-help"),
      ).toContainText("Empty = all catalog models");
      await page
        .getByTestId("agent-network-provider-continue")
        .click({ force: true });

      await expect(
        page.getByTestId("agent-network-provider-mappings-tab"),
      ).toHaveAttribute("data-state", "active");
      await expect(
        page.getByTestId("agent-network-provider-user-mapping"),
      ).toContainText("x-netbird-user-id");
      await expect(
        page.getByTestId("agent-network-provider-groups-mapping"),
      ).toContainText("x-netbird-groups");
      await expect(
        page.getByTestId("agent-network-provider-groups-guidance"),
      ).toContainText("must not be used as an agentgateway authorization claim");

      const createResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/agent-network/providers") &&
          response.request().method() === "POST",
        { timeout: 30_000 },
      );
      await page.getByTestId("agent-network-provider-submit").click({
        force: true,
      });
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
      await expect(
        page.getByTestId("agent-network-provider-modal"),
      ).toBeHidden();

      await expect(page.getByTestId(providerName)).toBeVisible();
      await expect(
        page.getByTestId(`provider-models-${providerName}`),
      ).toHaveText("All Models");

      await page.getByTestId(providerName).click({ force: true });
      await expect(
        page.getByTestId("agent-network-provider-modal"),
      ).toBeVisible();
      await expect(
        page.getByTestId("agent-network-provider-upstream-url"),
      ).toHaveValue(upstreamURL);
      await page
        .getByTestId("agent-network-provider-mappings-tab")
        .click({ force: true });
      await expect(
        page.getByTestId("agent-network-provider-user-mapping"),
      ).toContainText("x-netbird-user-id");
      await expect(
        page.getByTestId("agent-network-provider-groups-mapping"),
      ).toContainText("x-netbird-groups");
      await page
        .getByTestId("agent-network-provider-modal")
        .getByTestId("modal-close")
        .click({ force: true });
    } finally {
      await deleteAgentNetworkProvidersByPrefix(page, PROVIDER_PREFIX);
    }
  });
});

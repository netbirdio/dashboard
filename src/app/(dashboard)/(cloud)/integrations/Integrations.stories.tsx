import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import IntegrationsPage from "@/app/(dashboard)/(cloud)/integrations/page";
import DashboardLayout from "@/layouts/DashboardLayout";
import { edr, eventStreams, freeSubscription, idp } from "@/storybook/fixtures";
import { cards, modalTab, openCard, walk } from "@/storybook/integrations";
import { click, dialogCount, findText, settle } from "@/storybook/platform";

const meta: Meta = {
  title: "Pages/Platform/Cloud/Integrations",
  tags: ["cloud"],
  // The AWS wizards draw example credentials from Math.random for their placeholders.
  beforeEach: () => {
    const random = Math.random;
    let seed = 42;
    Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return () => {
      Math.random = random;
    };
  },
  render: () => (
    <DashboardLayout>
      <IntegrationsPage />
    </DashboardLayout>
  ),
};
export default meta;
type Story = StoryObj;
type Tab = "identity-provider" | "sso" | "event-streaming" | "edr";

const off = <T extends object>(items: T[]) =>
  items.map((item) => ({ ...item, enabled: false }));

/* Nothing connected, so every card offers its setup wizard. The Okta sync card
   needs an active Okta SSO connection, so the SSO connections stay in place there. */
const unconfiguredIdp = {
  "GET /integrations/google-idp": [],
  "GET /integrations/azure-idp": [],
  "GET /integrations/okta-scim-idp": [],
  "GET /integrations/scim-idp": [],
};
const unconfigured: Record<Tab, Record<string, unknown>> = {
  "identity-provider": unconfiguredIdp,
  sso: { "GET /service/idp": [] },
  "event-streaming": { "GET /integrations/event-streaming": [] },
  edr: Object.fromEntries(
    Object.keys(edr).map((key) => [`GET /integrations/edr/${key}`, {}]),
  ),
};

/* Every card connected but disabled: only one integration of a kind may be
   enabled at a time, and the others would render greyed out and unclickable. */
const stream = (id: number, platform: string, config: object) => ({
  ...eventStreams[0],
  id,
  platform,
  enabled: false,
  config: { api_key: "", api_url: "", ...config },
});
const configured: Record<Tab, Record<string, unknown>> = {
  "identity-provider": {
    "GET /integrations/google-idp": off(idp.google),
    "GET /integrations/okta-scim-idp": [
      {
        id: "okta-1",
        enabled: false,
        group_prefixes: ["okta-"],
        user_group_prefixes: [],
        auth_token: "nbs_••••7f3a",
      },
    ],
    "GET /integrations/scim-idp": [
      ...off(idp.scim),
      {
        ...idp.scim[0],
        id: "scim-jumpcloud-1",
        provider: "jumpcloud",
        enabled: false,
      },
      { ...idp.scim[0], id: "scim-entra-1", provider: "entra", enabled: false },
    ],
  },
  sso: {},
  "event-streaming": {
    "GET /integrations/event-streaming": [
      stream(2, "datadog", {
        api_url: "https://http-intake.logs.datadoghq.eu/api/v2/logs",
      }),
      stream(3, "s3", { url: "s3://acme-netbird-audit/events" }),
      stream(4, "firehose", {
        url: "arn:aws:firehose:eu-central-1:123456789012:deliverystream/netbird",
      }),
      ...off(eventStreams),
    ],
    // Datadog, S3 and Firehose have no settings modal; they only show here as connected cards.
  },
  edr: Object.fromEntries(
    Object.entries(edr).map(([key, value]) => [
      `GET /integrations/edr/${key}`,
      { ...value, enabled: false },
    ]),
  ),
};

/* The free plan with usage inside its limits, so the upsell shows without the limit-reached dialog over it. */
const freePlan = {
  "GET /integrations/billing/subscription": freeSubscription,
  "GET /integrations/billing/usage": {
    active_users: 3,
    total_users: 3,
    active_peers: 12,
    total_peers: 15,
  },
};

const at = (tab: Tab, api: Record<string, unknown> = {}) => ({
  nextjs: { navigation: { pathname: "/integrations", query: { tab } } },
  api,
});

const loaded = async () => {
  await cards();
  await settle(500);
};

const overview = (tab: Tab, api: Record<string, unknown> = {}): Story => ({
  parameters: at(tab, api),
  play: loaded,
});

const wizard = (tab: Tab, card: number, steps: number): Story => ({
  parameters: at(tab, unconfigured[tab]),
  play: async () => {
    await loaded();
    await openCard(card);
    await walk(steps);
  },
});

const settings = (tab: Tab, card: number, modalTabIndex?: number): Story => ({
  parameters: at(tab, configured[tab]),
  play: async () => {
    await loaded();
    await openCard(card);
    if (modalTabIndex !== undefined) await modalTab(modalTabIndex);
    await settle(400);
  },
});

export const IdentityProvider = overview("identity-provider");
export const IdentityProviderNoneConfigured = overview(
  "identity-provider",
  unconfiguredIdp,
);
export const IdentityProviderAllConfigured = overview(
  "identity-provider",
  configured["identity-provider"],
);
export const IdentityProviderLocked = overview("identity-provider", freePlan);
export const SSO = overview("sso");
export const SSONoneConfigured = overview("sso", unconfigured.sso);
export const SSOLocked = overview("sso", freePlan);
export const EventStreaming = overview("event-streaming");
export const EventStreamingNoneConfigured = overview(
  "event-streaming",
  unconfigured["event-streaming"],
);
export const EventStreamingDisabled = overview("event-streaming", {
  "GET /integrations/event-streaming": off(eventStreams),
});
export const EventStreamingLocked = overview("event-streaming", freePlan);
export const EDR = overview("edr");
export const EDRNoneConfigured = overview("edr", unconfigured.edr);
export const EDRAllConfigured = overview("edr", configured.edr);
export const EDRLocked = overview("edr", freePlan);

/* The card's Settings modal opens on the Domains tab; Verify opens the DNS instructions of a pending domain. */
export const SSOOktaVerifyDomain: Story = {
  parameters: at("sso"),
  play: async () => {
    await loaded();
    await openCard(0);
    const verify = Array.from(
      document.querySelectorAll("[role=dialog] button"),
    ).find((b) => b.textContent?.trim() === "Verify");
    await click(verify);
    await dialogCount(2);
    await findText(/netbird-verification=/);
    await settle(400);
  },
};

export const IdpGoogleWorkspaceSetup0 = wizard("identity-provider", 0, 0);
export const IdpGoogleWorkspaceSetup1 = wizard("identity-provider", 0, 1);
export const IdpGoogleWorkspaceSetup2 = wizard("identity-provider", 0, 2);
export const IdpGoogleWorkspaceSetup3 = wizard("identity-provider", 0, 3);
export const IdpGoogleWorkspaceSetup4 = wizard("identity-provider", 0, 4);
export const IdpGoogleWorkspaceSetup5 = wizard("identity-provider", 0, 5);
export const IdpGoogleWorkspaceSetup6 = wizard("identity-provider", 0, 6);
export const IdpGoogleWorkspaceSetup7 = wizard("identity-provider", 0, 7);
export const IdpGoogleWorkspaceSetup8 = wizard("identity-provider", 0, 8);
export const IdpGoogleWorkspaceSetup9 = wizard("identity-provider", 0, 9);
export const IdpGoogleWorkspaceSetup10 = wizard("identity-provider", 0, 10);
export const IdpEntraIDAPISetup0 = wizard("identity-provider", 1, 0);
export const IdpEntraIDAPISetup1 = wizard("identity-provider", 1, 1);
export const IdpEntraIDAPISetup2 = wizard("identity-provider", 1, 2);
export const IdpEntraIDAPISetup3 = wizard("identity-provider", 1, 3);
export const IdpEntraIDAPISetup4 = wizard("identity-provider", 1, 4);
export const IdpEntraIDAPISetup5 = wizard("identity-provider", 1, 5);
export const IdpEntraIDAPISetup6 = wizard("identity-provider", 1, 6);
export const IdpEntraIDSCIMSetup0 = wizard("identity-provider", 2, 0);
export const IdpEntraIDSCIMSetup1 = wizard("identity-provider", 2, 1);
export const IdpEntraIDSCIMSetup2 = wizard("identity-provider", 2, 2);
export const IdpEntraIDSCIMSetup3 = wizard("identity-provider", 2, 3);
export const IdpEntraIDSCIMSetup4 = wizard("identity-provider", 2, 4);
export const IdpEntraIDSCIMSetup5 = wizard("identity-provider", 2, 5);
export const IdpEntraIDSCIMSetup6 = wizard("identity-provider", 2, 6);
export const IdpOktaSetup0 = wizard("identity-provider", 3, 0);
export const IdpOktaSetup1 = wizard("identity-provider", 3, 1);
export const IdpOktaSetup2 = wizard("identity-provider", 3, 2);
export const IdpOktaSetup3 = wizard("identity-provider", 3, 3);
export const IdpOktaSetup4 = wizard("identity-provider", 3, 4);
export const IdpOktaSetup5 = wizard("identity-provider", 3, 5);
export const IdpJumpcloudSetup0 = wizard("identity-provider", 4, 0);
export const IdpJumpcloudSetup1 = wizard("identity-provider", 4, 1);
export const IdpJumpcloudSetup2 = wizard("identity-provider", 4, 2);
export const IdpJumpcloudSetup3 = wizard("identity-provider", 4, 3);
export const IdpGenericSCIMSetup0 = wizard("identity-provider", 5, 0);
export const IdpGenericSCIMSetup1 = wizard("identity-provider", 5, 1);
export const IdpGenericSCIMSetup2 = wizard("identity-provider", 5, 2);
export const IdpGenericSCIMSetup3 = wizard("identity-provider", 5, 3);

export const SSOOktaSetup0 = wizard("sso", 0, 0);
export const SSOOktaSetup1 = wizard("sso", 0, 1);
export const SSOOktaSetup2 = wizard("sso", 0, 2);

export const EventStreamingDatadogSetup0 = wizard("event-streaming", 0, 0);
export const EventStreamingDatadogSetup1 = wizard("event-streaming", 0, 1);
export const EventStreamingAmazonS3Setup0 = wizard("event-streaming", 1, 0);
export const EventStreamingAmazonS3Setup1 = wizard("event-streaming", 1, 1);
export const EventStreamingAmazonS3Setup2 = wizard("event-streaming", 1, 2);
export const EventStreamingAmazonDataFirehoseSetup0 = wizard(
  "event-streaming",
  2,
  0,
);
export const EventStreamingAmazonDataFirehoseSetup1 = wizard(
  "event-streaming",
  2,
  1,
);
export const EventStreamingAmazonDataFirehoseSetup2 = wizard(
  "event-streaming",
  2,
  2,
);
export const EventStreamingGenericHTTPSetup0 = wizard("event-streaming", 3, 0);
export const EventStreamingGenericHTTPSetup1 = wizard("event-streaming", 3, 1);
export const EventStreamingGenericHTTPSetup2 = wizard("event-streaming", 3, 2);

export const EDRCrowdStrikeSetup0 = wizard("edr", 0, 0);
export const EDRCrowdStrikeSetup1 = wizard("edr", 0, 1);
export const EDRCrowdStrikeSetup2 = wizard("edr", 0, 2);
export const EDRIntuneSetup0 = wizard("edr", 1, 0);
export const EDRIntuneSetup1 = wizard("edr", 1, 1);
export const EDRIntuneSetup2 = wizard("edr", 1, 2);
export const EDRIntuneSetup3 = wizard("edr", 1, 3);
export const EDRIntuneSetup4 = wizard("edr", 1, 4);
export const EDRIntuneSetup5 = wizard("edr", 1, 5);
export const EDRIntuneSetup6 = wizard("edr", 1, 6);
export const EDRSentinelOneSetup0 = wizard("edr", 2, 0);
export const EDRSentinelOneSetup1 = wizard("edr", 2, 1);
export const EDRSentinelOneSetup2 = wizard("edr", 2, 2);
export const EDRSentinelOneSetup3 = wizard("edr", 2, 3);
export const EDRSentinelOneSetup4 = wizard("edr", 2, 4);
export const EDRSentinelOneSetup5 = wizard("edr", 2, 5);
export const EDRHuntressSetup0 = wizard("edr", 3, 0);
export const EDRHuntressSetup1 = wizard("edr", 3, 1);
export const EDRHuntressSetup2 = wizard("edr", 3, 2);
export const EDRHuntressSetup3 = wizard("edr", 3, 3);
export const EDRHuntressSetup4 = wizard("edr", 3, 4);
export const EDRFleetDMSetup0 = wizard("edr", 4, 0);
export const EDRFleetDMSetup1 = wizard("edr", 4, 1);
export const EDRFleetDMSetup2 = wizard("edr", 4, 2);
export const EDRFleetDMSetup3 = wizard("edr", 4, 3);
export const EDRFleetDMSetup4 = wizard("edr", 4, 4);
export const EDRFleetDMSetup5 = wizard("edr", 4, 5);

export const IdpGoogleWorkspaceSettingsSettings = settings(
  "identity-provider",
  0,
  0,
);
export const IdpGoogleWorkspaceSettingsGroupSync = settings(
  "identity-provider",
  0,
  1,
);
export const IdpGoogleWorkspaceSettingsUserSync = settings(
  "identity-provider",
  0,
  2,
);
export const IdpGoogleWorkspaceSettingsDangerZone = settings(
  "identity-provider",
  0,
  3,
);
export const IdpEntraIDAPISettingsSettings = settings(
  "identity-provider",
  1,
  0,
);
export const IdpEntraIDAPISettingsGroupSync = settings(
  "identity-provider",
  1,
  1,
);
export const IdpEntraIDAPISettingsUserSync = settings(
  "identity-provider",
  1,
  2,
);
export const IdpEntraIDAPISettingsDangerZone = settings(
  "identity-provider",
  1,
  3,
);
export const IdpEntraIDSCIMSettingsSettings = settings(
  "identity-provider",
  2,
  0,
);
export const IdpEntraIDSCIMSettingsGroupSync = settings(
  "identity-provider",
  2,
  1,
);
export const IdpEntraIDSCIMSettingsUserSync = settings(
  "identity-provider",
  2,
  2,
);
export const IdpEntraIDSCIMSettingsDangerZone = settings(
  "identity-provider",
  2,
  3,
);
export const IdpOktaSettingsSettings = settings("identity-provider", 3, 0);
export const IdpOktaSettingsGroupSync = settings("identity-provider", 3, 1);
export const IdpOktaSettingsUserSync = settings("identity-provider", 3, 2);
export const IdpOktaSettingsDangerZone = settings("identity-provider", 3, 3);
export const IdpJumpcloudSettingsSettings = settings("identity-provider", 4, 0);
export const IdpJumpcloudSettingsGroupSync = settings(
  "identity-provider",
  4,
  1,
);
export const IdpJumpcloudSettingsUserSync = settings("identity-provider", 4, 2);
export const IdpJumpcloudSettingsDangerZone = settings(
  "identity-provider",
  4,
  3,
);
export const IdpGenericSCIMSettingsSettings = settings(
  "identity-provider",
  5,
  0,
);
export const IdpGenericSCIMSettingsGroupSync = settings(
  "identity-provider",
  5,
  1,
);
export const IdpGenericSCIMSettingsUserSync = settings(
  "identity-provider",
  5,
  2,
);
export const IdpGenericSCIMSettingsDangerZone = settings(
  "identity-provider",
  5,
  3,
);

export const SSOOktaSettingsDomains = settings("sso", 0, 0);
export const SSOOktaSettingsConfiguration = settings("sso", 0, 1);
export const SSOOktaSettingsDangerZone = settings("sso", 0, 2);

export const EventStreamingGenericHTTPSettingsGeneral = settings(
  "event-streaming",
  3,
  0,
);
export const EventStreamingGenericHTTPSettingsHeaders = settings(
  "event-streaming",
  3,
  1,
);
export const EventStreamingGenericHTTPSettingsBodyTemplate = settings(
  "event-streaming",
  3,
  2,
);
export const EventStreamingGenericHTTPSettingsDangerZone = settings(
  "event-streaming",
  3,
  3,
);

export const EDRCrowdStrikeSettingsPeerApproval = settings("edr", 0, 0);
export const EDRCrowdStrikeSettingsSettings = settings("edr", 0, 1);
export const EDRCrowdStrikeSettingsDangerZone = settings("edr", 0, 2);
export const EDRIntuneSettingsPeerApproval = settings("edr", 1, 0);
export const EDRIntuneSettingsSyncWindow = settings("edr", 1, 1);
export const EDRIntuneSettingsSettings = settings("edr", 1, 2);
export const EDRIntuneSettingsDangerZone = settings("edr", 1, 3);
export const EDRSentinelOneSettingsPeerApproval = settings("edr", 2, 0);
export const EDRSentinelOneSettingsCompliance = settings("edr", 2, 1);
export const EDRSentinelOneSettingsSettings = settings("edr", 2, 2);
export const EDRSentinelOneSettingsDangerZone = settings("edr", 2, 3);
export const EDRHuntressSettingsPeerApproval = settings("edr", 3, 0);
export const EDRHuntressSettingsCompliance = settings("edr", 3, 1);
export const EDRHuntressSettingsSettings = settings("edr", 3, 2);
export const EDRHuntressSettingsDangerZone = settings("edr", 3, 3);
export const EDRFleetDMSettingsPeerApproval = settings("edr", 4, 0);
export const EDRFleetDMSettingsCompliance = settings("edr", 4, 1);
export const EDRFleetDMSettingsSettings = settings("edr", 4, 2);
export const EDRFleetDMSettingsDangerZone = settings("edr", 4, 3);

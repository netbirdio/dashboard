import { GROUP } from "./ids";
import type { Handler, HandlerContext } from "./index";

const lastSegment = (path: string, offset = 0) =>
  path
    .split("/")
    .filter(Boolean)
    .at(-1 - offset)!;

/* ---------- Billing ---------- */

const ALL_FEATURES = [
  "IDP_SYNC",
  "DEVICE_APPROVALS",
  "EDR",
  "POSTURE_CHECKS",
  "EVENT_STREAMING",
  "MSP",
  "TRAFFIC_EVENTS",
];

export const plans = [
  {
    name: "Free",
    description:
      "For individuals and small teams getting started with NetBird.",
    features: ["5 users", "100 machines", "Peer-to-peer connections"],
    prices: [
      { currency: "eur", price: 0, price_id: "price_free_eur", unit: "user" },
      { currency: "usd", price: 0, price_id: "price_free_usd", unit: "user" },
    ],
    free: true,
  },
  {
    name: "Team",
    description:
      "For growing teams that need user management and access control.",
    features: ["Unlimited users", "Groups & policies", "IdP sync"],
    prices: [
      { currency: "eur", price: 500, price_id: "price_team_eur", unit: "user" },
      { currency: "usd", price: 500, price_id: "price_team_usd", unit: "user" },
    ],
    free: false,
  },
  {
    name: "Business",
    description:
      "For organisations with advanced security, compliance and integration requirements.",
    features: [
      "Posture checks",
      "EDR integrations",
      "Event streaming",
      "Traffic events",
    ],
    prices: [
      {
        currency: "eur",
        price: 1200,
        price_id: "price_business_eur",
        unit: "user",
      },
      {
        currency: "usd",
        price: 1200,
        price_id: "price_business_usd",
        unit: "user",
      },
    ],
    free: false,
  },
];

/* Business keeps every cloud page unlocked, so other areas screenshot real content, not upsells. */
export const businessSubscription = {
  active: true,
  plan_tier: "business",
  price_id: "price_business_eur",
  price: 1200,
  currency: "eur",
  updated_at: "2026-06-01T09:00:00Z",
  features: ALL_FEATURES,
  provider: "stripe",
};

export const trialSubscription = {
  active: true,
  plan_tier: "trial",
  price_id: "price_business_eur",
  currency: "eur",
  updated_at: "2026-10-01T09:00:00Z",
  remaining_trial: 2 * 86400 + 3600,
  features: ALL_FEATURES,
  provider: "stripe",
};

export const freeSubscription = {
  active: false,
  plan_tier: "free",
  price_id: "",
  currency: "eur",
  updated_at: "2026-03-01T09:00:00Z",
  features: [],
  provider: "stripe",
};

const usage = {
  active_users: 14,
  total_users: 17,
  active_peers: 96,
  total_peers: 128,
};

/* ---------- MSP tenants ---------- */

export const mspInfo = {
  id: "acc-storybook",
  activated_at: "2026-01-10T10:00:00Z",
  domain: "netbird.io",
  name: "NetBird Managed Services",
  status: "active",
};

export const tenants = [
  {
    id: "tenant-acme",
    name: "Acme Corporation",
    domain: "acme.com",
    groups: [
      { id: GROUP.devops, role: "admin" },
      { id: GROUP.developers, role: "user" },
      { id: GROUP.contractors, role: "auditor" },
    ],
    activated_at: "2026-02-01T10:00:00Z",
    disabled_at: "",
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    status: "active",
  },
  {
    id: "tenant-globex",
    name: "Globex Industries International Holdings",
    domain: "globex-industries-international.example",
    groups: [{ id: GROUP.devops, role: "owner" }],
    activated_at: "2026-03-15T10:00:00Z",
    disabled_at: "",
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-09-12T10:00:00Z",
    status: "active",
  },
  {
    id: "tenant-initech",
    name: "Initech",
    domain: "initech.io",
    groups: [],
    activated_at: "2026-09-25T10:00:00Z",
    disabled_at: "",
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T10:00:00Z",
    status: "active",
  },
  {
    id: "tenant-umbrella",
    name: "Umbrella Labs",
    domain: "umbrella-labs.dev",
    groups: [{ id: GROUP.servers, role: "admin" }],
    activated_at: "2026-05-20T10:00:00Z",
    disabled_at: "",
    created_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    status: "active",
  },
  {
    id: "tenant-hooli",
    name: "Hooli",
    domain: "hooli.xyz",
    groups: [{ id: GROUP.devops, role: "admin" }],
    disabled_at: "",
    created_at: "2026-10-05T10:00:00Z",
    updated_at: "2026-10-05T10:00:00Z",
    status: "pending",
  },
  {
    id: "tenant-piedpiper",
    name: "Pied Piper",
    domain: "piedpiper.com",
    groups: [],
    disabled_at: "",
    created_at: "2026-10-06T10:00:00Z",
    updated_at: "2026-10-06T10:00:00Z",
    status: "invited",
  },
  {
    id: "tenant-stark",
    name: "Stark Industries",
    domain: "stark.example",
    groups: [],
    disabled_at: "",
    created_at: "2026-10-07T10:00:00Z",
    updated_at: "2026-10-07T10:00:00Z",
    status: "existing",
  },
];

export const tenantSwitcher = tenants
  .filter((t) => t.status === "active")
  .map((t) => ({
    id: t.id,
    account_id: t.id,
    activated_at: t.activated_at,
    created_at: t.created_at,
    disabled_at: t.disabled_at,
    name: t.name,
    domain: t.domain,
    updated_at: t.updated_at,
    status: t.status,
  }));

/* Each tenant/customer account gets its own plan so every plan badge variant renders. */
const accountSubscriptions: Record<string, object> = {
  "tenant-acme": businessSubscription,
  "tenant-globex": {
    ...businessSubscription,
    plan_tier: "team",
    price_id: "price_team_eur",
    price: 500,
  },
  "tenant-initech": { ...trialSubscription, remaining_trial: 9 * 86400 },
  "tenant-umbrella": {
    ...freeSubscription,
    plan_tier: "trial",
    remaining_trial: 0,
  },
  "cust-wayne": businessSubscription,
  "cust-cyberdyne": {
    ...businessSubscription,
    plan_tier: "team",
    price_id: "price_team_eur",
    price: 500,
  },
  "cust-tyrell": { ...trialSubscription, remaining_trial: 5 * 86400 },
  "cust-soylent": {
    ...freeSubscription,
    plan_tier: "free",
    remaining_trial: 0,
  },
};

const accountUsage: Record<string, object> = {
  "tenant-acme": {
    active_users: 42,
    total_users: 48,
    active_peers: 512,
    total_peers: 590,
  },
  "tenant-globex": {
    active_users: 7,
    total_users: 9,
    active_peers: 64,
    total_peers: 70,
  },
  "tenant-initech": {
    active_users: 3,
    total_users: 3,
    active_peers: 12,
    total_peers: 15,
  },
  "tenant-umbrella": {
    active_users: 1,
    total_users: 2,
    active_peers: 4,
    total_peers: 6,
  },
};

/* ---------- Distributor (reseller) ---------- */

export const distributorInfo = {
  activated_at: "2025-11-01T10:00:00Z",
  domain: "netbird.io",
  name: "NetBird Distribution GmbH",
  parent_owner_email: "owner@netbird.io",
  parent_owner_name: "Olivia Owner",
};

export const customers = [
  {
    id: "cust-wayne",
    name: "Wayne Enterprises",
    domain: "wayne-enterprises.com",
    activated_at: "2026-01-12T10:00:00Z",
    owner_email: "bruce@wayne-enterprises.com",
    has_reseller: true,
    reseller_customer_id: "CUST-000184",
    status: "active",
    tenant_number: 12,
  },
  {
    id: "cust-cyberdyne",
    name: "Cyberdyne Systems",
    domain: "cyberdyne.example",
    activated_at: "2026-04-03T10:00:00Z",
    owner_email: "miles@cyberdyne.example",
    has_reseller: true,
    reseller_customer_id: "CUST-000231",
    status: "active",
    tenant_number: 3,
  },
  {
    id: "cust-tyrell",
    name: "Tyrell Corporation",
    domain: "tyrell.example",
    activated_at: "2026-09-20T10:00:00Z",
    owner_email: "eldon@tyrell.example",
    has_reseller: true,
    status: "active",
    tenant_number: 0,
  },
  {
    id: "cust-soylent",
    name: "Soylent Green Managed IT Services and Consulting",
    domain: "soylent-green-consulting.example",
    activated_at: "2026-02-20T10:00:00Z",
    owner_email: "ops@soylent-green-consulting.example",
    has_reseller: true,
    reseller_customer_id: "CUST-000099",
    status: "active",
    tenant_number: 1,
  },
  {
    id: "cust-oscorp",
    name: "Oscorp",
    domain: "oscorp.example",
    owner_email: "norman@oscorp.example",
    has_reseller: false,
    invited_at: "2026-10-04T10:00:00Z",
    status: "invited",
  },
];

/* ---------- Invoices ---------- */

const invoices = [
  {
    id: "inv-2026-09",
    period_start: "2026-09-01T00:00:00Z",
    period_end: "2026-09-30T23:59:59Z",
    type: "account",
  },
  {
    id: "inv-2026-09-t",
    period_start: "2026-09-01T00:00:00Z",
    period_end: "2026-09-30T23:59:59Z",
    type: "tenants",
  },
  {
    id: "inv-2026-08",
    period_start: "2026-08-01T00:00:00Z",
    period_end: "2026-08-31T23:59:59Z",
    type: "account",
  },
  {
    id: "inv-2026-07",
    period_start: "2026-07-01T00:00:00Z",
    period_end: "2026-07-31T23:59:59Z",
    type: "account",
  },
  {
    id: "inv-2026-06",
    period_start: "2026-06-01T00:00:00Z",
    period_end: "2026-06-30T23:59:59Z",
    type: "account",
  },
];

/* ---------- Notifications ---------- */

const notificationTypes = {
  "peer.pending.approval": "Peer pending approval",
  "peer.add": "Peer added",
  "routing.peer.disconnect": "Routing peer disconnected",
  "routing.peer.delete": "Routing peer deleted",
  "user.pending.approval": "User pending approval",
  "user.join": "User joined",
  "service.user.create": "Service user created",
  "idp.sync.token.expire": "IdP sync token expiring",
  "edr.sync.token.expire": "EDR sync token expiring",
};

export const notificationChannels = [
  {
    id: "nc-email",
    type: "email",
    enabled: true,
    target: {
      emails: [
        "owner@netbird.io",
        "security@netbird.io",
        "it-operations-team-notifications@netbird.io",
      ],
    },
    event_types: Object.keys(notificationTypes),
  },
  {
    id: "nc-webhook",
    type: "webhook",
    enabled: true,
    target: {
      url: "https://hooks.netbird.io/notifications/incoming/3f9a2c1e",
      headers: { Authorization: "Bearer ••••••••", "X-Source": "netbird" },
    },
    event_types: ["peer.add", "routing.peer.disconnect", "user.join"],
  },
  // Exists but is not connected, so its page shows the Connect flow without creating anything.
  {
    id: "nc-slack",
    type: "slack",
    enabled: false,
    event_types: Object.keys(notificationTypes),
  },
];

/* ---------- Integrations ---------- */

/* Only one EDR may be enabled at a time, so the others render greyed out. */
export const edr = {
  falcon: {
    client_id: "9f6c80ac8a384e1d88a1fd1f279541d0",
    secret: "",
    cloud_id: "eu-1",
    groups: [GROUP.developers, GROUP.devops, GROUP.servers],
    zta_score_threshold: 75,
    enabled: true,
  },
  intune: {
    client_id: "2f1c8a7e-6b1d-4c3e-9f0a-1b2c3d4e5f60",
    secret: "",
    tenant_id: "8e7d6c5b-4a39-4821-9a0b-c1d2e3f4a5b6",
    last_synced_interval: 24,
    groups: [GROUP.officeBerlin, GROUP.officeNewYork],
    enabled: false,
  },
  sentinelone: {
    api_token: "",
    api_url: "https://euce1-netbird.sentinelone.net",
    last_synced_interval: 24,
    last_synced_at: "2026-10-08T09:15:00Z",
    groups: [GROUP.servers],
    match_attributes: {
      active_threats: 0,
      encrypted_applications: true,
      firewall_enabled: true,
      infected: false,
      is_active: true,
      is_up_to_date: true,
      network_status: "connected",
      operational_state: "na",
    },
    enabled: false,
  },
  huntress: {
    api_key: "hk_live_4f2a",
    api_secret: "",
    last_synced_interval: 24,
    last_synced_at: "2026-10-07T22:00:00Z",
    groups: [GROUP.contractors],
    match_attributes: {
      defender_policy_status: "Compliant",
      defender_status: "Protected",
      defender_substatus: "Up to date",
      firewall_status: "Enabled",
    },
    enabled: false,
  },
  fleetdm: {
    api_url: "https://fleet.netbird.io",
    api_token: "",
    last_synced_interval: 24,
    last_synced_at: "2026-10-08T06:00:00Z",
    groups: [GROUP.developers, GROUP.kubernetes],
    match_attributes: {
      disk_encryption_enabled: true,
      failing_policies_count_max: 2,
      vulnerable_software_count_max: 5,
      status_online: true,
      required_policies: [12, 31],
    },
    enabled: false,
  },
};

export const idp = {
  google: [
    {
      id: "gws-1",
      customer_id: "C03az79cb",
      sync_interval: 300,
      enabled: true,
      group_prefixes: ["eng-", "ops-"],
      user_group_prefixes: ["netbird-"],
    },
  ],
  azure: [
    {
      id: "azure-1",
      client_id: "2f1c8a7e-6b1d-4c3e-9f0a-1b2c3d4e5f60",
      tenant_id: "8e7d6c5b-4a39-4821-9a0b-c1d2e3f4a5b6",
      sync_interval: 600,
      enabled: false,
      group_prefixes: [],
      user_group_prefixes: [],
    },
  ],
  okta: [] as object[],
  scim: [
    {
      id: "scim-generic-1",
      provider: "generic",
      enabled: false,
      group_prefixes: ["scim-"],
      user_group_prefixes: [],
      auth_token: "nbs_••••••••••••••••7f3a",
      last_synced_at: "2026-10-08T11:30:00Z",
    },
  ],
};

const idpLogs = [
  { id: 3, level: "info", timestamp: "2026-10-08T11:42:00Z" },
  { id: 2, level: "info", timestamp: "2026-10-08T11:32:00Z" },
  { id: 1, level: "error", timestamp: "2026-10-08T11:22:00Z" },
];

export const eventStreams = [
  {
    id: 1,
    account_id: "acc-storybook",
    enabled: true,
    platform: "generic_http",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    config: {
      url: "https://siem.netbird.io/ingest/netbird",
      headers: JSON.stringify({
        Authorization: "Bearer ••••••••",
        "X-Tenant": "netbird",
      }),
      body_template: '{"event": {{.Event}}, "timestamp": "{{.Timestamp}}"}',
      api_key: "",
      api_url: "",
    },
  },
];

/* Served from the auth service origin in cloud, see `serviceFixtures` below. */
export const enterpriseConnections = [
  {
    id: "con-okta",
    enabled: true,
    name: "netbird-okta",
    strategy: "okta",
    discovery_domain: "netbird.okta.com",
    client_id: "0oa1b2c3d4e5f6g7h8i9",
    scopes: ["openid", "profile", "email"],
    domains: [
      {
        name: "netbird.io",
        validation_token: "netbird-verification=6c1f0a3e9b2d4e7f",
        validation_status: "verified",
        validation_last_updated: "2026-09-02T10:00:00Z",
      },
      {
        name: "netbird.dev",
        validation_token: "netbird-verification=1a2b3c4d5e6f7a8b",
        validation_status: "pending",
        validation_last_updated: "2026-10-07T10:00:00Z",
      },
      {
        name: "netbird-legacy.example",
        validation_token: "netbird-verification=ffeeddccbbaa9988",
        validation_status: "failed",
        validation_last_updated: "2026-10-01T10:00:00Z",
      },
    ],
  },
];

/* In cloud the auth service (config.authServiceUrl) shares the mock API origin, so its
   paths arrive here without the /api prefix. */
export const serviceFixtures: Record<string, Handler> = {
  "GET /service/idp": enterpriseConnections,
  "GET /service/idp/sso": [
    {
      id: "con-okta",
      strategy: "okta",
      provider: "okta",
      name: "netbird-okta",
    },
  ],
  "GET /service/mfa": {
    id: "acc-storybook",
    mfa: true,
    mfaRememberBrowser: true,
  },
  "GET /service/mfa/:id": [
    { id: "mfa-otp", type: "authenticator", confirmed: true },
  ],
  "GET /service/sign-in-domains": [],
};

export const cloudFixtures: Record<string, Handler> = {
  ...serviceFixtures,
  "GET /integrations/billing/plans": plans,
  "GET /integrations/billing/subscription": ({ query }: HandlerContext) => {
    const account = query.get("account");
    return account
      ? accountSubscriptions[account] ?? freeSubscription
      : businessSubscription;
  },
  "GET /integrations/billing/usage": ({ query }: HandlerContext) => {
    const account = query.get("account");
    return account ? accountUsage[account] ?? usage : usage;
  },
  "GET /integrations/billing/portal": {
    url: "https://billing.storybook.test/portal",
  },
  "POST /integrations/billing/checkout": {
    url: "https://billing.storybook.test/checkout",
  },
  "GET /integrations/billing/invoices": invoices,

  // A plain customer account by default; the MSP, tenant and customer stories override these.
  "GET /integrations/msp": {},
  "GET /integrations/msp/switcher": [],
  "GET /integrations/msp/tenants": tenants,
  "GET /integrations/msp/reseller": {},
  "GET /integrations/msp/reseller/msps": customers,
  "GET /integrations/msp/reseller/invoices": invoices,

  "GET /integrations/notifications/types": notificationTypes,
  "GET /integrations/notifications/channels": notificationChannels,

  "GET /integrations/edr/falcon": edr.falcon,
  "GET /integrations/edr/intune": edr.intune,
  "GET /integrations/edr/sentinelone": edr.sentinelone,
  "GET /integrations/edr/huntress": edr.huntress,
  "GET /integrations/edr/fleetdm": edr.fleetdm,

  "GET /integrations/google-idp": idp.google,
  "GET /integrations/azure-idp": idp.azure,
  "GET /integrations/okta-scim-idp": idp.okta,
  "GET /integrations/scim-idp": idp.scim,
  "GET /integrations/google-idp/:id/logs": idpLogs,
  "GET /integrations/azure-idp/:id/logs": idpLogs,
  "GET /integrations/okta-scim-idp/:id/logs": idpLogs,
  "GET /integrations/scim-idp/:id/logs": idpLogs,
  // Setup wizards fetch a SCIM token when they reach the token step.
  "POST /integrations/scim-idp": ({ body }: HandlerContext) => ({
    id: "scim-new",
    provider: (body as { provider?: string })?.provider ?? "generic",
    enabled: true,
    group_prefixes: [],
    user_group_prefixes: [],
    auth_token: "nbs_6Jx2kQ9vT4mR8wZ1pL5sY3nB7cF0hD2g",
  }),
  "POST /integrations/scim-idp/:id/token": ({ path }: HandlerContext) => ({
    id: lastSegment(path, 1),
    auth_token: "nbs_6Jx2kQ9vT4mR8wZ1pL5sY3nB7cF0hD2g",
  }),
  "POST /integrations/okta-scim-idp": {
    id: "okta-new",
    auth_token: "nbs_Okta4mR8wZ1pL5sY3nB7cF0hD2g6Jx2kQ9",
  },
  "POST /integrations/okta-scim-idp/:id/token": {
    auth_token: "nbs_Okta4mR8wZ1pL5sY3nB7cF0hD2g6Jx2kQ9",
  },

  "GET /integrations/event-streaming": eventStreams,
};

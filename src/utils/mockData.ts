/**
 * THROWAWAY local preview scaffolding (auto-login + filler data).
 * Active only when NEXT_PUBLIC_MOCK=true. Delete this file together with the
 * `MOCK_ENABLED` guards in:
 *   - src/utils/api.tsx (apiRequest)
 *   - src/utils/unauthenticatedApi.ts (unauthenticatedRequest)
 *   - src/auth/SecureProvider.tsx (auth bypass)
 *   - .local-config.json  (dev config)
 */

export const MOCK_ENABLED = process.env.NEXT_PUBLIC_MOCK === "true";

const ALL = { create: true, read: true, update: true, delete: true };
const MODULE_KEYS = [
  "peers", "groups", "setup_keys", "policies", "assistant", "networks",
  "routes", "nameservers", "dns", "users", "pats", "events", "settings",
  "accounts", "billing", "identity_providers", "edr", "event_streaming",
  "idp", "msp", "tenants", "proxy", "proxy_configuration", "services",
];
const MODULES = Object.fromEntries(MODULE_KEYS.map((k) => [k, { ...ALL }]));
const PERMISSIONS = { is_restricted: false, modules: MODULES };

const T = {
  now: "2026-05-30T12:00:00Z",
  recent: "2026-05-30T11:42:00Z",
  old: "2026-05-12T09:15:00Z",
  created: "2025-11-01T08:00:00Z",
  login: "2026-05-29T20:00:00Z",
};

const currentUser = {
  id: "user-ada",
  email: "ada@netbird.example",
  name: "Ada Lovelace",
  role: "owner",
  status: "active",
  auto_groups: [],
  is_current: true,
  is_service_user: false,
  is_blocked: false,
  pending_approval: false,
  last_login: T.login,
  permissions: PERMISSIONS,
};

const users = [
  currentUser,
  {
    id: "user-grace",
    email: "grace@netbird.example",
    name: "Grace Hopper",
    role: "admin",
    status: "active",
    auto_groups: ["grp-eng"],
    is_current: false,
    is_service_user: false,
    last_login: T.login,
    permissions: PERMISSIONS,
  },
  {
    id: "user-alan",
    email: "alan@netbird.example",
    name: "Alan Turing",
    role: "user",
    status: "invited",
    auto_groups: ["grp-eng"],
    is_current: false,
    is_service_user: false,
    last_login: T.old,
    permissions: PERMISSIONS,
  },
];

const serviceUsers = [
  {
    id: "svc-ci",
    name: "CI Pipeline",
    role: "admin",
    status: "active",
    auto_groups: [],
    is_current: false,
    is_service_user: true,
    last_login: T.recent,
    permissions: PERMISSIONS,
  },
];

const groups = [
  { id: "grp-all", name: "All", peers_count: 6, resources_count: 0, issued: "api" },
  { id: "grp-eng", name: "Engineering", peers_count: 3, resources_count: 1, issued: "api" },
  { id: "grp-ops", name: "Operations", peers_count: 2, resources_count: 0, issued: "api" },
  { id: "grp-servers", name: "Servers", peers_count: 2, resources_count: 0, issued: "api" },
  { id: "grp-jwt", name: "idp-synced", peers_count: 1, resources_count: 0, issued: "jwt" },
];

const g = (id: string, name: string) => ({ id, name });

const peers = [
  {
    id: "peer-1", name: "ada-macbook", hostname: "ada-macbook", ip: "100.92.0.11",
    connected: true, os: "Darwin 14.4", version: "0.63.0", ui_version: "0.63.0",
    groups: [g("grp-all", "All"), g("grp-eng", "Engineering")], ssh_enabled: true,
    user_id: "user-ada", dns_label: "ada-macbook.netbird.cloud", last_seen: T.now,
    last_login: T.login, login_expired: false, login_expiration_enabled: true,
    inactivity_expiration_enabled: false, approval_required: false,
    city_name: "London", country_code: "GB", connection_ip: "84.12.33.7",
    serial_number: "C02ABCDEF", ephemeral: false, created_at: T.created,
  },
  {
    id: "peer-2", name: "grace-thinkpad", hostname: "grace-thinkpad", ip: "100.92.0.12",
    connected: true, os: "Linux 6.8 (Ubuntu 24.04)", version: "0.63.0", ui_version: "0.63.0",
    groups: [g("grp-all", "All"), g("grp-eng", "Engineering")], ssh_enabled: true,
    user_id: "user-grace", dns_label: "grace-thinkpad.netbird.cloud", last_seen: T.recent,
    last_login: T.login, login_expired: false, login_expiration_enabled: true,
    inactivity_expiration_enabled: false, approval_required: false,
    city_name: "Berlin", country_code: "DE", connection_ip: "91.40.12.9",
    serial_number: "PF0XYZ12", ephemeral: false, created_at: T.created,
  },
  {
    id: "peer-3", name: "build-server-01", hostname: "build-server-01", ip: "100.92.0.21",
    connected: true, os: "Linux 6.1 (Debian 12)", version: "0.62.4", ui_version: "0.62.4",
    groups: [g("grp-all", "All"), g("grp-servers", "Servers"), g("grp-ops", "Operations")],
    ssh_enabled: true, dns_label: "build-server-01.netbird.cloud", last_seen: T.now,
    last_login: T.created, login_expired: false, login_expiration_enabled: false,
    inactivity_expiration_enabled: false, approval_required: false,
    city_name: "Frankfurt", country_code: "DE", connection_ip: "5.9.122.40",
    serial_number: "SRV-001", ephemeral: false, created_at: T.created,
  },
  {
    id: "peer-4", name: "edge-gateway", hostname: "edge-gateway", ip: "100.92.0.22",
    connected: false, os: "Linux 5.15", version: "0.61.0", ui_version: "0.61.0",
    groups: [g("grp-all", "All"), g("grp-servers", "Servers")], ssh_enabled: false,
    dns_label: "edge-gateway.netbird.cloud", last_seen: T.old,
    last_login: T.created, login_expired: true, login_expiration_enabled: true,
    inactivity_expiration_enabled: false, approval_required: false,
    city_name: "Amsterdam", country_code: "NL", connection_ip: "185.3.94.12",
    serial_number: "SRV-002", ephemeral: false, created_at: T.created,
  },
  {
    id: "peer-5", name: "alan-iphone", hostname: "alan-iphone", ip: "100.92.0.31",
    connected: false, os: "iOS 17.4", version: "0.40.0", ui_version: "0.40.0",
    groups: [g("grp-all", "All")], ssh_enabled: false,
    user_id: "user-alan", dns_label: "alan-iphone.netbird.cloud", last_seen: T.old,
    last_login: T.old, login_expired: false, login_expiration_enabled: true,
    inactivity_expiration_enabled: true, approval_required: true,
    city_name: "Manchester", country_code: "GB", connection_ip: "82.5.11.3",
    serial_number: "IP-77", ephemeral: false, created_at: T.created,
  },
  {
    id: "peer-6", name: "ops-windows", hostname: "ops-windows", ip: "100.92.0.41",
    connected: true, os: "Windows 11", version: "0.63.0", ui_version: "0.63.0",
    groups: [g("grp-all", "All"), g("grp-ops", "Operations")], ssh_enabled: true,
    dns_label: "ops-windows.netbird.cloud", last_seen: T.now,
    last_login: T.login, login_expired: false, login_expiration_enabled: true,
    inactivity_expiration_enabled: false, approval_required: false,
    city_name: "Dublin", country_code: "IE", connection_ip: "159.134.2.8",
    serial_number: "WIN-9", ephemeral: false, created_at: T.created,
  },
];

const policies = [
  {
    id: "pol-1", name: "Default", description: "Allow all within the network",
    enabled: true,
    rules: [{
      id: "rule-1", name: "Default", enabled: true, bidirectional: true,
      protocol: "all", action: "accept",
      sources: [g("grp-all", "All")], destinations: [g("grp-all", "All")],
    }],
  },
  {
    id: "pol-2", name: "Engineering → Servers", description: "Engineers can reach servers",
    enabled: true,
    rules: [{
      id: "rule-2", name: "eng-servers", enabled: true, bidirectional: false,
      protocol: "tcp", action: "accept", ports: ["22", "443"],
      sources: [g("grp-eng", "Engineering")], destinations: [g("grp-servers", "Servers")],
    }],
  },
];

const setupKeys = [
  {
    id: "key-1", key: "EEEE****-****-****-****-********CCCC", name: "Default key",
    type: "reusable", expires: "2026-12-31T00:00:00Z", updated_at: T.recent,
    revoked: false, used_times: 12, last_used: T.recent, state: "valid",
    auto_groups: ["grp-eng"], usage_limit: 0, ephemeral: false, valid: true,
  },
  {
    id: "key-2", key: "1111****-****-****-****-********9999", name: "One-off server",
    type: "one-off", expires: "2026-06-30T00:00:00Z", updated_at: T.old,
    revoked: false, used_times: 1, last_used: T.old, state: "valid",
    auto_groups: ["grp-servers"], usage_limit: 1, ephemeral: false, valid: true,
  },
];

const nameservers = [
  {
    id: "ns-1", name: "Google DNS", description: "Public resolver",
    nameservers: [
      { ip: "8.8.8.8", ns_type: "udp", port: 53 },
      { ip: "8.8.4.4", ns_type: "udp", port: 53 },
    ],
    enabled: true, groups: ["grp-all"], primary: true, domains: [],
    search_domains_enabled: false,
  },
];

const routes = [
  {
    id: "route-1", network_id: "office-lan", description: "Office LAN", network: "10.10.0.0/16",
    enabled: true, peer: "peer-3", peer_groups: [], metric: 9999, masquerade: true,
    groups: ["grp-eng"],
  },
];

const networks = [
  {
    id: "net-1", name: "Corporate", description: "Main corporate network",
    routers: ["peer-3"], routing_peers_count: 1, resources: ["res-1"], policies: ["pol-1"],
  },
];

const networkResources = [
  {
    id: "res-1", name: "Internal Wiki", description: "Confluence", type: "host",
    address: "10.10.1.50", enabled: true, groups: [g("grp-eng", "Engineering")],
    network_id: "net-1",
  },
];

const account = {
  id: "acc-1", domain: "netbird.example", domain_category: "private",
  created_at: T.created, created_by: "user-ada",
  settings: {
    extra: { peer_approval_enabled: false, user_approval_required: false },
    peer_login_expiration_enabled: true,
    peer_expose_enabled: false, peer_expose_groups: [],
    peer_login_expiration: 86400,
    peer_inactivity_expiration_enabled: false, peer_inactivity_expiration: 600,
    groups_propagation_enabled: true, jwt_groups_enabled: false,
    jwt_groups_claim_name: "roles", jwt_allow_groups: [],
    regular_users_view_blocked: false, routing_peer_dns_resolution_enabled: true,
    dns_domain: "netbird.cloud", network_range: "100.92.0.0/16",
    lazy_connection_enabled: false, embedded_idp_enabled: false,
    auto_update_version: "0.63.0", auto_update_always: false,
    local_auth_disabled: false, local_mfa_enabled: false,
    ipv6_enabled_groups: [], network_range_v6: "",
  },
  onboarding: { onboarding_flow_pending: false, signup_form_pending: false },
};

const events = [
  { id: "ev-1", timestamp: T.now, activity: "Peer connected", activity_code: "peer.login",
    initiator_id: "user-ada", initiator_email: "ada@netbird.example", initiator_name: "Ada Lovelace",
    target_id: "peer-1", meta: { name: "ada-macbook" } },
  { id: "ev-2", timestamp: T.recent, activity: "Group created", activity_code: "group.add",
    initiator_id: "user-grace", initiator_email: "grace@netbird.example", initiator_name: "Grace Hopper",
    target_id: "grp-eng", meta: { name: "Engineering" } },
  { id: "ev-3", timestamp: T.old, activity: "Setup key created", activity_code: "setupkey.add",
    initiator_id: "user-ada", initiator_email: "ada@netbird.example", initiator_name: "Ada Lovelace",
    target_id: "key-1", meta: { name: "Default key" } },
];

const countries = [
  { country_code: "GB", country_name: "United Kingdom" },
  { country_code: "DE", country_name: "Germany" },
  { country_code: "NL", country_name: "Netherlands" },
  { country_code: "IE", country_name: "Ireland" },
  { country_code: "US", country_name: "United States" },
];

function getQueryParam(query: string, key: string): string | null {
  return new URLSearchParams(query).get(key);
}

/** Returns filler data for GET requests; echoes payloads for writes. */
export function mockApiRequest<T>(
  method: string,
  url: string,
  data?: any,
): Promise<T> {
  const [rawPath, query = ""] = url.split("?");
  const path = rawPath.replace(/\/+$/, "");

  if (method !== "GET") {
    // Pretend writes succeed: echo the payload (with an id) back.
    const body =
      data && typeof data === "object"
        ? { id: (data as any).id || "mock-id", ...data }
        : {};
    return Promise.resolve(body as T);
  }

  const resolve = (v: unknown) => Promise.resolve(v as T);

  if (path === "/users/current") return resolve(currentUser);
  if (path === "/users") {
    const su = getQueryParam(query, "service_user");
    if (su === "true") return resolve(serviceUsers);
    if (su === "false") return resolve(users);
    return resolve([...users, ...serviceUsers]);
  }
  if (path === "/users/invites") return resolve([]);
  if (path === "/peers") return resolve(peers);
  if (/^\/peers\/[^/]+\/jobs$/.test(path)) return resolve([]);
  if (/^\/peers\/[^/]+$/.test(path)) {
    const id = path.split("/")[2];
    return resolve(peers.find((p) => p.id === id) || peers[0]);
  }
  if (path === "/groups") return resolve(groups);
  if (/^\/groups\/[^/]+$/.test(path)) {
    const id = path.split("/")[2];
    return resolve(groups.find((x) => x.id === id) || groups[0]);
  }
  if (path === "/policies") return resolve(policies);
  if (path === "/posture-checks") return resolve([]);
  if (path === "/setup-keys") return resolve(setupKeys);
  if (path === "/dns/nameservers") return resolve(nameservers);
  if (path === "/dns/settings")
    return resolve({ items: [], disabled_management_groups: [] });
  if (path === "/dns/zones") return resolve([]);
  if (path === "/routes") return resolve(routes);
  if (path === "/networks") return resolve(networks);
  if (path === "/networks/resources") return resolve(networkResources);
  if (/^\/networks\/[^/]+\/resources$/.test(path)) return resolve(networkResources);
  if (/^\/networks\/[^/]+\/routers$/.test(path)) return resolve([]);
  if (path === "/accounts") return resolve([account]);
  if (path === "/events/audit") return resolve(events);
  if (path === "/locations/countries") return resolve(countries);
  if (path === "/identity-providers") return resolve([]);
  if (path === "/reverse-proxies/clusters") return resolve([]);
  if (path === "/reverse-proxies/services") return resolve([]);

  // Safe default: most list consumers expect an array.
  return resolve([]);
}

/** Mock for the unauthenticated endpoints (instance status, etc.). */
export function mockUnauthenticated<T>(endpoint: string): Promise<T> {
  if (endpoint === "/instance") {
    return Promise.resolve({ setup_required: false } as T);
  }
  return Promise.resolve({} as T);
}

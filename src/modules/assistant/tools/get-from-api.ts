// The management-API reads share one behavior — GET a path, redact the
// response through the tool's own config, return it — so their specs live
// together. `fields` is the whitelist: `true` passes verbatim, a string
// tokenises the value under that kind, a nested config recurses; anything
// not listed is dropped.
import type { RedactionConfig } from "@/modules/assistant/utils/redaction";
import type { ManagementApiCall } from "@/modules/assistant/utils/tools";

const GROUP_MINIMUM: RedactionConfig = {
  handle: "group",
  labelled: true,
  fields: { peers_count: true, resources_count: true, issued: true },
};

const PEER_MINIMUM: RedactionConfig = { handle: "peer", fields: {} };

const RESOURCE: RedactionConfig = {
  handle: "resource",
  labelled: true,
  fields: { description: true, enabled: true, type: true, address: "domain" },
};

const PEER: RedactionConfig = {
  handle: "peer",
  fields: {
    yours: true,
    connected: true,
    last_seen: true,
    os: true,
    kernel_version: true,
    version: true,
    ui_version: true,
    ssh_enabled: true,
    country_code: true,
    created_at: true,
    last_login: true,
    login_expired: true,
    login_expiration_enabled: true,
    inactivity_expiration_enabled: true,
    approval_required: true,
    ephemeral: true,
    accessible_peers_count: true,
    ip: "ip",
    ipv6: "ip",
    connection_ip: "ip",
    dns_label: "dns",
    hostname: "dns",
    extra_dns_labels: "dns",
    user_id: "user",
    serial_number: "serial",
    city_name: "city",
    groups: GROUP_MINIMUM,
  },
};

const GROUP: RedactionConfig = {
  handle: "group",
  labelled: true,
  fields: {
    peers_count: true,
    resources_count: true,
    issued: true,
    peers: PEER_MINIMUM,
    resources: RESOURCE,
  },
};

const POLICY_RULE: RedactionConfig = {
  handle: "policy",
  labelled: true,
  fields: {
    enabled: true,
    description: true,
    action: true,
    bidirectional: true,
    protocol: true,
    ports: true,
    port_ranges: true,
    sources: GROUP_MINIMUM,
    destinations: GROUP_MINIMUM,
    sourceResource: RESOURCE,
    destinationResource: RESOURCE,
  },
};

const POLICY: RedactionConfig = {
  handle: "policy",
  labelled: true,
  fields: {
    enabled: true,
    description: true,
    rules: POLICY_RULE,
    source_posture_checks: "posture_check",
  },
};

const ROUTE: RedactionConfig = {
  handle: "route",
  labelled: true,
  fields: {
    description: true,
    enabled: true,
    metric: true,
    masquerade: true,
    keep_route: true,
    network_type: true,
    skip_auto_apply: true,
    network_id: "network",
    network: "cidr",
    domains: "domain",
    peer: "peer",
    peer_groups: "group",
    groups: "group",
    access_control_groups: "group",
  },
};

const NAMESERVER: RedactionConfig = {
  fields: { ns_type: true, port: true, ip: "ip" },
};

const NAMESERVER_GROUP: RedactionConfig = {
  handle: "nsgroup",
  labelled: true,
  fields: {
    description: true,
    enabled: true,
    primary: true,
    search_domains_enabled: true,
    nameservers: NAMESERVER,
    domains: "domain",
    groups: "group",
  },
};

// `key` (the secret) is not listed → dropped.
const SETUP_KEY: RedactionConfig = {
  handle: "setup_key",
  labelled: true,
  fields: {
    yours: true,
    expires: true,
    type: true,
    valid: true,
    revoked: true,
    used_times: true,
    last_used: true,
    state: true,
    updated_at: true,
    usage_limit: true,
    ephemeral: true,
    allow_extra_dns_labels: true,
    auto_groups: "group",
  },
};

// `password`, `idp_id`, `permissions` are not listed → dropped.
const USER: RedactionConfig = {
  handle: "user",
  fields: {
    yours: true,
    role: true,
    status: true,
    last_login: true,
    is_current: true,
    is_service_user: true,
    is_blocked: true,
    pending_approval: true,
    issued: true,
    email: "email",
    auto_groups: "group",
  },
};

// `meta` (free-form, may embed identifiers) is not listed → dropped.
const EVENT: RedactionConfig = {
  handle: "event",
  fields: {
    activity: true,
    activity_code: true,
    timestamp: true,
    initiator_id: "user",
    initiator_name: "user",
    initiator_email: "email",
    target_id: "resource",
  },
};

const ACCOUNT_SETTINGS: RedactionConfig = {
  fields: {
    peer_login_expiration_enabled: true,
    peer_login_expiration: true,
    peer_inactivity_expiration_enabled: true,
    peer_inactivity_expiration: true,
    regular_users_view_blocked: true,
    groups_propagation_enabled: true,
    jwt_groups_enabled: true,
    jwt_groups_claim_name: true,
    routing_peer_dns_resolution_enabled: true,
    peer_expose_enabled: true,
    lazy_connection_enabled: true,
    auto_update_version: true,
    auto_update_always: true,
    metrics_push_enabled: true,
    agent_network_only: true,
    embedded_idp_enabled: true,
    local_auth_disabled: true,
    local_mfa_enabled: true,
    dns_domain: "domain",
    network_range: "cidr",
    network_range_v6: "cidr",
    peer_expose_groups: "group",
    ipv6_enabled_groups: "group",
    jwt_allow_groups: "group",
  },
};

export const getPeers: ManagementApiCall = {
  path: () => "/peers",
  redact: PEER,
};

export const getPeer: ManagementApiCall = {
  path: (i) => `/peers/${encodeURIComponent(String(i.peer_id))}`,
  redact: PEER,
};

export const getGroups: ManagementApiCall = {
  path: () => "/groups",
  redact: GROUP,
};

export const getPolicies: ManagementApiCall = {
  path: () => "/policies",
  redact: POLICY,
};

export const getRoutes: ManagementApiCall = {
  path: () => "/routes",
  redact: ROUTE,
};

export const getNameserverGroups: ManagementApiCall = {
  path: () => "/dns/nameservers",
  redact: NAMESERVER_GROUP,
};

export const getSetupKeys: ManagementApiCall = {
  path: () => "/setup-keys",
  redact: SETUP_KEY,
};

export const getUsers: ManagementApiCall = {
  path: () => "/users",
  redact: USER,
};

export const getCurrentUser: ManagementApiCall = {
  path: () => "/users/current",
  redact: USER,
};

export const getAccountSettings: ManagementApiCall = {
  path: () => "/accounts",
  redact: ACCOUNT_SETTINGS,
  // `GET /accounts` returns a list; the model only ever wants the settings.
  select: (raw) => {
    const account = Array.isArray(raw) ? raw[0] : raw;
    if (account && typeof account === "object" && "settings" in account) {
      return account.settings;
    }
    return undefined;
  },
};

export const getEvents: ManagementApiCall = {
  path: () => "/events/audit",
  redact: EVENT,
};

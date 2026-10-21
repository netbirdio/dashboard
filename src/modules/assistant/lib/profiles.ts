/**
 * Field allowlists for every management API result the model may read. They
 * are also the operation allowlist: an operation without a profile cannot be
 * called. In a profile, `true` passes a field through, a string tokenises
 * it under that kind, a nested profile recurses, and any unlisted field is
 * dropped. Ids pass through as they are: they say nothing about anyone, and
 * the model needs them to read further. A `handle` marks a record, keeping its
 * `id` and `name`; a `personal` record's name (a peer's, a person's) becomes a
 * token of the handle's kind, while an admin-chosen label (a group or policy
 * name) stays readable, since it says what a thing is for.
 *
 * The dashboard applies them when it reads the account, before tokenising, and
 * the agent applies them again to what arrives, so a result the dashboard got
 * wrong still carries no more than its profile lists.
 */
export interface Profile {
  handle?: string;
  personal?: boolean;
  fields: Record<string, true | string | Profile>;
}

const GROUP_MINIMUM: Profile = {
  handle: "group",
  fields: { peers_count: true, resources_count: true, issued: true },
};

const PEER_MINIMUM: Profile = { handle: "peer", personal: true, fields: {} };

const RESOURCE: Profile = {
  handle: "resource",
  fields: { description: true, enabled: true, type: true, address: "domain" },
};

const PEER: Profile = {
  handle: "peer",
  personal: true,
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
    // Usually the peer's name, so the same kind gives it the same token.
    hostname: "peer",
    extra_dns_labels: "dns",
    user_id: true,
    serial_number: "serial",
    city_name: "city",
    groups: GROUP_MINIMUM,
  },
};

const GROUP: Profile = {
  handle: "group",
  fields: {
    peers_count: true,
    resources_count: true,
    issued: true,
    peers: PEER_MINIMUM,
    resources: RESOURCE,
  },
};

const POLICY_RULE: Profile = {
  handle: "policy",
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

const POLICY: Profile = {
  handle: "policy",
  fields: {
    enabled: true,
    description: true,
    rules: POLICY_RULE,
    source_posture_checks: true,
  },
};

const ROUTE: Profile = {
  handle: "route",
  fields: {
    description: true,
    enabled: true,
    metric: true,
    masquerade: true,
    keep_route: true,
    network_type: true,
    skip_auto_apply: true,
    network_id: true,
    network: "cidr",
    domains: "domain",
    peer: true,
    peer_groups: true,
    groups: true,
    access_control_groups: true,
  },
};

const NAMESERVER: Profile = {
  fields: { ns_type: true, port: true, ip: "ip" },
};

const NAMESERVER_GROUP: Profile = {
  handle: "nsgroup",
  fields: {
    description: true,
    enabled: true,
    primary: true,
    search_domains_enabled: true,
    nameservers: NAMESERVER,
    domains: "domain",
    groups: true,
  },
};

const SETUP_KEY: Profile = {
  handle: "setup_key",
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
    auto_groups: true,
  },
};

const USER: Profile = {
  handle: "user",
  personal: true,
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
    auto_groups: true,
  },
};

export const AUDIT_EVENT_ROW: Profile = {
  handle: "event",
  fields: {
    timestamp: true,
    activity: true,
    activity_code: true,
    initiator_name: "user",
    initiator_email: "email",
    target: true,
    peer: "peer",
    user: "user",
    group: true,
    // A rename can be a peer's hostname.
    old_name: "name",
    new_name: "name",
    email: "email",
  },
};

const ACCOUNT_SETTINGS: Profile = {
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
    peer_expose_groups: true,
    ipv6_enabled_groups: true,
    jwt_allow_groups: true,
  },
};

const POSTURE_CHECK: Profile = {
  handle: "posture_check",
  fields: {
    description: true,
    checks: {
      fields: {
        nb_version_check: { fields: { min_version: true } },
        os_version_check: {
          fields: {
            android: { fields: { min_version: true } },
            darwin: { fields: { min_version: true } },
            ios: { fields: { min_version: true } },
            linux: { fields: { min_kernel_version: true } },
            windows: { fields: { min_kernel_version: true } },
          },
        },
        geo_location_check: {
          fields: {
            action: true,
            locations: { fields: { country_code: true, city_name: "city" } },
          },
        },
        peer_network_range_check: {
          fields: { action: true, ranges: "cidr" },
        },
        process_check: {
          fields: {
            processes: {
              fields: { linux_path: true, mac_path: true, windows_path: true },
            },
          },
        },
      },
    },
  },
};

const NETWORK: Profile = {
  handle: "network",
  fields: {
    description: true,
    routing_peers_count: true,
    routers: true,
    resources: true,
    policies: true,
  },
};

const DNS_SETTINGS: Profile = {
  fields: { disabled_management_groups: "group" },
};

const FLOW_ENDPOINT: Profile = {
  fields: {
    type: true,
    os: true,
    id: true,
    // Most endpoints are peers, whose names are personal.
    name: "peer",
    address: "ip",
    port: true,
    dns_label: "dns",
    geo_location: { fields: { country_code: true, city_name: "city" } },
  },
};

const FLOW_EVENT: Profile = {
  fields: {
    protocol: true,
    direction: true,
    rx_bytes: true,
    rx_packets: true,
    tx_bytes: true,
    tx_packets: true,
    num_of_starts: true,
    num_of_ends: true,
    num_of_drops: true,
    window_start: true,
    window_end: true,
    icmp: { fields: { type: true, code: true } },
    events: { fields: { type: true, timestamp: true } },
    flow_id: true,
    reporter_id: true,
    source: FLOW_ENDPOINT,
    destination: FLOW_ENDPOINT,
    policy: { handle: "policy", fields: {} },
    user: { handle: "user", personal: true, fields: { email: "email" } },
  },
};

const FLOW_EVENTS_PAGE: Profile = {
  fields: {
    page: true,
    page_size: true,
    total_records: true,
    total_pages: true,
    data: FLOW_EVENT,
  },
};

const PROXY_ACCESS_LOG: Profile = {
  fields: {
    id: true,
    service_id: true,
    timestamp: true,
    method: true,
    host: "domain",
    path: true,
    protocol: true,
    status_code: true,
    reason: true,
    duration_ms: true,
    bytes_upload: true,
    bytes_download: true,
    source_ip: "ip",
    country_code: true,
    subdivision_code: true,
    city_name: "city",
    user_id: true,
    auth_method_used: true,
    metadata: { fields: { crowdsec_verdict: true } },
  },
};

const PROXY_ACCESS_LOGS_PAGE: Profile = {
  fields: {
    page: true,
    page_size: true,
    total_records: true,
    total_pages: true,
    data: PROXY_ACCESS_LOG,
  },
};

function portOf(address: unknown): number | undefined {
  if (typeof address !== "string") return undefined;
  const m = /^(?:\[[^\]]+\]|[^:]+):(\d{1,5})$/.exec(address);
  return m ? Number(m[1]) : undefined;
}

function withFlowPorts(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const page = raw as { data?: unknown };
  if (!Array.isArray(page.data)) return raw;
  const endpoint = (e: unknown) => {
    if (!e || typeof e !== "object") return e;
    const port = portOf((e as { address?: unknown }).address);
    return port === undefined ? e : { ...e, port };
  };
  return {
    ...page,
    data: page.data.map((flow) =>
      flow && typeof flow === "object"
        ? {
            ...flow,
            source: endpoint((flow as { source?: unknown }).source),
            destination: endpoint((flow as { destination?: unknown }).destination),
          }
        : flow,
    ),
  };
}

const AGENT_PROVIDER_MODEL: Profile = {
  fields: {
    id: true,
    input_per_1k: true,
    output_per_1k: true,
    cached_input_per_1k: true,
    cache_read_per_1k: true,
    cache_creation_per_1k: true,
  },
};

const AGENT_PROVIDER: Profile = {
  handle: "provider",
  fields: {
    provider_id: true,
    enabled: true,
    metadata_disabled: true,
    skip_tls_verification: true,
    models: AGENT_PROVIDER_MODEL,
    upstream_url: "domain",
  },
};

const AGENT_POLICY_LIMITS: Profile = {
  fields: {
    token_limit: {
      fields: {
        enabled: true,
        group_cap: true,
        user_cap: true,
        window_seconds: true,
      },
    },
    budget_limit: {
      fields: {
        enabled: true,
        group_cap_usd: true,
        user_cap_usd: true,
        window_seconds: true,
      },
    },
  },
};

const AGENT_POLICY: Profile = {
  handle: "agent_policy",
  fields: {
    description: true,
    enabled: true,
    source_groups: true,
    destination_provider_ids: true,
    guardrail_ids: true,
    limits: AGENT_POLICY_LIMITS,
  },
};

const AGENT_GUARDRAIL: Profile = {
  handle: "guardrail",
  fields: {
    description: true,
    checks: {
      fields: {
        model_allowlist: { fields: { enabled: true, models: true } },
        prompt_capture: { fields: { enabled: true, redact_pii: true } },
      },
    },
  },
};

const AGENT_BUDGET_RULE: Profile = {
  handle: "budget_rule",
  fields: {
    enabled: true,
    target_groups: true,
    target_users: true,
    limits: AGENT_POLICY_LIMITS,
  },
};

const AGENT_SETTINGS: Profile = {
  fields: {
    dedicated: true,
    enable_log_collection: true,
    enable_prompt_collection: true,
    redact_pii: true,
    access_log_retention_days: true,
    endpoint: "domain",
    proxy_address: "domain",
  },
};

export interface OperationProfile {
  /** GET path; `{id}` is filled from the call's `id`. */
  path: string;
  profile: Profile;
  /** Narrows the raw payload before the profile applies. */
  select?: (raw: unknown) => unknown;
}

// The read-only operations `netbird_api` may call.
export const PROFILES: Record<string, OperationProfile> = {
  get_api_peers: { path: "/api/peers", profile: PEER },
  get_api_peers_peerId: { path: "/api/peers/{id}", profile: PEER },
  get_api_groups: { path: "/api/groups", profile: GROUP },
  get_api_policies: { path: "/api/policies", profile: POLICY },
  get_api_routes: { path: "/api/routes", profile: ROUTE },
  get_api_dns_nameservers: { path: "/api/dns/nameservers", profile: NAMESERVER_GROUP },
  get_api_setup_keys: { path: "/api/setup-keys", profile: SETUP_KEY },
  get_api_users: { path: "/api/users", profile: USER },
  get_api_posture_checks: { path: "/api/posture-checks", profile: POSTURE_CHECK },
  get_api_networks: { path: "/api/networks", profile: NETWORK },
  get_api_dns_settings: { path: "/api/dns/settings", profile: DNS_SETTINGS },
  get_api_events_network_traffic: {
    path: "/api/events/network-traffic",
    profile: FLOW_EVENTS_PAGE,
    select: withFlowPorts,
  },
  get_api_events_proxy: { path: "/api/events/proxy", profile: PROXY_ACCESS_LOGS_PAGE },
  get_api_users_current: { path: "/api/users/current", profile: USER },
  get_api_agent_network_providers: { path: "/api/agent-network/providers", profile: AGENT_PROVIDER },
  get_api_agent_network_policies: { path: "/api/agent-network/policies", profile: AGENT_POLICY },
  get_api_agent_network_guardrails: { path: "/api/agent-network/guardrails", profile: AGENT_GUARDRAIL },
  get_api_agent_network_budget_rules: { path: "/api/agent-network/budget-rules", profile: AGENT_BUDGET_RULE },
  get_api_agent_network_settings: { path: "/api/agent-network/settings", profile: AGENT_SETTINGS },
  get_api_accounts: {
    path: "/api/accounts",
    profile: ACCOUNT_SETTINGS,
    select: (raw) => {
      const account = Array.isArray(raw) ? raw[0] : raw;
      if (account && typeof account === "object" && "settings" in account) {
        return (account as { settings: unknown }).settings;
      }
      return undefined;
    },
  },
};

/** What `audit_events` returns: an envelope around rows profiled as AUDIT_EVENT_ROW. */
export const AUDIT_RESULT: Profile = {
  fields: { window_days: true, matched: true, shown: true, note: true, rows: AUDIT_EVENT_ROW },
};

export const NETBIRD_OPERATIONS = Object.keys(PROFILES) as [string, ...string[]];

/**
 * The same walk as the vault's, without tokenising: drops every field the
 * profile does not list.
 */
export function allowlist(value: unknown, profile: Profile): unknown {
  if (Array.isArray(value)) return value.map((v) => allowlist(v, profile));
  if (!value || typeof value !== "object") return profile.handle || typeof value !== "string" ? value : undefined;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const keep = profile.handle && (key === "id" || key === "name");
    const rule = Object.hasOwn(profile.fields, key) ? profile.fields[key] : undefined;
    if (keep || rule === true || typeof rule === "string") out[key] = raw;
    else if (rule) out[key] = allowlist(raw, rule);
  }
  return out;
}


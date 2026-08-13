/**
 * Pseudonymization contract — the privacy boundary between the user's real NetBird
 * data and the model.
 *
 * The MODEL and this SERVER never see real identifiers. The caller (frontend)
 * executes a management tool with the user's JWT, then **redacts the result
 * through this spec before sending it back**: real values become type-preserving,
 * identity-hiding placeholders (`{PEER_1}`, `{IP_3}`, `{EMAIL_2}`, …). The model
 * reasons over placeholders — it still knows *kinds* and *structure* (`{PEER_1}`
 * is connected, runs Linux, is in `{GROUP_2}`) but never the real identity — and
 * the caller reverses the placeholders in the model's output for display and for
 * follow-up calls.
 *
 * ALLOWLIST, default-deny. Each resource declares exactly what may leave the trust
 * boundary: `keep` (safe fields passed through verbatim), `transform` (fields
 * allowed only as placeholders), and `handle` (id/name → one handle). **Every
 * other field — including any the API adds later — is dropped.** A denylist would
 * leak new/unforeseen fields by default; this cannot.
 *
 * This module is the single source of truth for what is sensitive, grounded in the
 * NetBird OpenAPI. The reference `Redactor` is the canonical behavior the frontend
 * mirrors (safe to publish as a shared package). The server never runs it on real
 * data — it has none — but it's exercised in tests so the contract is unambiguous.
 */

/**
 * Placeholder token format: `{PEER_1}`, `{IP_3}`, `{EMAIL_2}`.
 *
 * Braced and uppercased so a token is visually unmistakable in model output and
 * self-delimiting — which is what lets `restore()` match without word-boundary
 * guards, and removes the `{PEER_1}` / `{PEER_12}` prefix-collision class
 * entirely (the closing brace disambiguates them).
 */
export function formatToken(type: PlaceholderType, n: number): string {
  return `{${type.toUpperCase()}_${n}}`;
}

/** Type-preserving placeholder categories. The prefix tells the model the KIND. */
export type PlaceholderType =
  | "peer"
  | "group"
  | "policy"
  | "route"
  | "network"
  | "nsgroup"
  | "setup_key"
  | "user"
  | "event"
  | "resource"
  | "posture_check"
  // A control-center canvas node. Not an account resource — a handle for
  // something on screen, so the assistant can act on it without being told
  // whose device it is.
  | "node"
  | "ip"
  | "cidr"
  | "domain"
  | "dns"
  | "serial"
  | "city"
  | "email";

/** How an allowed-but-sensitive field is pseudonymized. */
export type TransformRule =
  | PlaceholderType // scalar string → placeholder
  | { array: PlaceholderType } // array of scalars → array of placeholders
  | { nested: ResourceType }; // (array of) sub-objects → recurse with this spec

export interface ResourceRedaction {
  /** Placeholder type for this resource's own `id` and `name` (its handle). */
  handle?: PlaceholderType;
  /**
   * The `name` is an admin's own label, not anyone's identity — a policy called
   * "Allow contractors to build servers", a group called "Engineering". Those
   * carry most of the meaning in a network, and stripping them left the model
   * reasoning about `{POLICY_3}` with no idea what it was for.
   *
   * The `id` is still tokenised, so the model has a stable reference to call
   * tools with and never sees a real identifier. Absent (peers, users) means
   * the name is treated as identifying: a machine named after the person who
   * carries it is personal data, and so is a person.
   */
  labelled?: boolean;
  /** Safe fields passed through verbatim. Everything not listed here is dropped. */
  keep: readonly string[];
  /** Sensitive fields that may pass only as placeholders. */
  transform?: Record<string, TransformRule>;
}

/** Resource kinds the spec covers (tool results + nested sub-objects). */
export type ResourceType =
  | "peer"
  | "peer_minimum"
  | "group"
  | "group_minimum"
  | "policy"
  | "policy_rule"
  | "route"
  | "nameserver_group"
  | "nameserver"
  | "setup_key"
  | "user"
  | "event"
  | "account_settings"
  | "network"
  | "network_resource"
  | "resource";

/**
 * The redaction allowlist, grounded in shared/management/http/api/openapi.yml.
 * `keep` fields are deliberately preserved so the model can still answer
 * operational questions; anything absent is dropped by default.
 */
export const REDACTION: Record<ResourceType, ResourceRedaction> = {
  peer: {
    handle: "peer",
    keep: [
      // Computed in the executor from /users/current — see `markOwnership`.
      "yours",
      "connected",
      "last_seen",
      "os",
      "kernel_version",
      "version",
      "ui_version",
      "ssh_enabled",
      "country_code",
      "created_at",
      "last_login",
      "login_expired",
      "login_expiration_enabled",
      "inactivity_expiration_enabled",
      "approval_required",
      "ephemeral",
      "accessible_peers_count",
    ],
    transform: {
      ip: "ip",
      ipv6: "ip",
      connection_ip: "ip",
      dns_label: "dns",
      hostname: "dns",
      extra_dns_labels: { array: "dns" },
      user_id: "user",
      serial_number: "serial",
      city_name: "city",
      groups: { nested: "group_minimum" },
    },
  },
  peer_minimum: { handle: "peer", keep: [] },
  group_minimum: {
    handle: "group",
    labelled: true,
    keep: ["peers_count", "resources_count", "issued"],
  },
  group: {
    handle: "group",
    labelled: true,
    keep: ["peers_count", "resources_count", "issued"],
    transform: {
      peers: { nested: "peer_minimum" },
      resources: { nested: "resource" },
    },
  },
  policy: {
    handle: "policy",
    labelled: true,
    keep: ["enabled", "description"],
    transform: {
      rules: { nested: "policy_rule" },
      source_posture_checks: { array: "posture_check" },
    },
  },
  policy_rule: {
    handle: "policy",
    labelled: true,
    keep: [
      "enabled",
      "description",
      "action",
      "bidirectional",
      "protocol",
      "ports",
      "port_ranges",
    ],
    transform: {
      sources: { nested: "group_minimum" },
      destinations: { nested: "group_minimum" },
      sourceResource: { nested: "resource" },
      destinationResource: { nested: "resource" },
    },
  },
  route: {
    handle: "route",
    labelled: true,
    keep: [
      "description",
      "enabled",
      "metric",
      "masquerade",
      "keep_route",
      "network_type",
      "skip_auto_apply",
    ],
    transform: {
      network_id: "network",
      network: "cidr",
      domains: { array: "domain" },
      peer: "peer",
      peer_groups: { array: "group" },
      groups: { array: "group" },
      access_control_groups: { array: "group" },
    },
  },
  nameserver_group: {
    handle: "nsgroup",
    labelled: true,
    keep: ["description", "enabled", "primary", "search_domains_enabled"],
    transform: {
      nameservers: { nested: "nameserver" },
      domains: { array: "domain" },
      groups: { array: "group" },
    },
  },
  nameserver: { keep: ["ns_type", "port"], transform: { ip: "ip" } },
  setup_key: {
    handle: "setup_key",
    labelled: true,
    keep: [
      "yours",
      "expires",
      "type",
      "valid",
      "revoked",
      "used_times",
      "last_used",
      "state",
      "updated_at",
      "usage_limit",
      "ephemeral",
      "allow_extra_dns_labels",
    ],
    transform: { auto_groups: { array: "group" } },
    // `key` (the secret) is not listed → dropped.
  },
  user: {
    handle: "user",
    keep: [
      // Computed in the executor from /users/current — see `markOwnership`.
      "yours",
      "role",
      "status",
      "last_login",
      "is_current",
      "is_service_user",
      "is_blocked",
      "pending_approval",
      "issued",
    ],
    transform: { email: "email", auto_groups: { array: "group" } },
    // `password`, `idp_id`, `permissions` are not listed → dropped.
  },
  event: {
    handle: "event",
    keep: ["activity", "activity_code", "timestamp"],
    transform: {
      initiator_id: "user",
      initiator_name: "user",
      initiator_email: "email",
      target_id: "resource",
    },
    // `meta` (free-form, may embed identifiers) is not listed → dropped.
  },
  account_settings: {
    keep: [
      "peer_login_expiration_enabled",
      "peer_login_expiration",
      "peer_inactivity_expiration_enabled",
      "peer_inactivity_expiration",
      "regular_users_view_blocked",
      "groups_propagation_enabled",
      "jwt_groups_enabled",
      "jwt_groups_claim_name",
      "routing_peer_dns_resolution_enabled",
      "peer_expose_enabled",
      "lazy_connection_enabled",
      "auto_update_version",
      "auto_update_always",
      "metrics_push_enabled",
      "agent_network_only",
      "embedded_idp_enabled",
      "local_auth_disabled",
      "local_mfa_enabled",
    ],
    transform: {
      dns_domain: "domain",
      network_range: "cidr",
      network_range_v6: "cidr",
      peer_expose_groups: { array: "group" },
      ipv6_enabled_groups: { array: "group" },
      jwt_allow_groups: { array: "group" },
    },
  },
  network: {
    handle: "network",
    labelled: true,
    keep: ["description"],
    transform: { resources: { nested: "network_resource" } },
  },
  network_resource: {
    handle: "resource",
    labelled: true,
    keep: ["description", "enabled", "type"],
    transform: { address: "domain" },
  },
  resource: {
    handle: "resource",
    labelled: true,
    keep: ["description", "enabled", "type"],
    transform: { address: "domain" },
  },
};

// ── reference implementation (canonical behavior for the frontend) ────────────

/** What a placeholder token stands for: real id (for API calls) + display name. */
export interface RealValue {
  /** The real value to send back to management (a resource id, or the raw scalar). */
  real: string;
  /** The value to show the user when restoring (a resource name, or the raw scalar). */
  display: string;
}

/**
 * Stateful pseudonymizer for ONE conversation. Assigns stable placeholders
 * (same real value → same token) and reverses them in the model's output. A
 * resource's `id` and `name` collapse to a single handle so the model sees one
 * token per resource, while the frontend keeps both (real id for calls, name for
 * display). Redaction is allowlist-based: unlisted fields are dropped.
 */
export class Redactor {
  private counters = new Map<PlaceholderType, number>();
  /** `${type} ${real}` → token, for stable assignment. */
  private forward = new Map<string, string>();
  /** token → {real, display}. */
  private reverse = new Map<string, RealValue>();

  private mint(type: PlaceholderType, real: string, display: string): string {
    const key = `${type} ${real}`;
    const existing = this.forward.get(key);
    if (existing) {
      /*
        Upgrade a display that is still just the id. The first mint for a
        resource can happen where no name is in reach — a bare id in a nested
        field, a canvas node whose entity was named elsewhere — and a token that
        restores to `69b666c4321c` tells the user nothing. A real name replaces
        it as soon as one shows up; the token itself never changes.
      */
      const current = this.reverse.get(existing);
      if (current && current.display === current.real && display !== real) {
        this.reverse.set(existing, { real, display });
      }
      return existing;
    }
    const n = (this.counters.get(type) ?? 0) + 1;
    this.counters.set(type, n);
    const token = formatToken(type, n);
    this.forward.set(key, token);
    this.reverse.set(token, { real, display });
    return token;
  }

  /**
   * Placeholder for a resource handle, keyed by id and displayed as its name —
   * the same pairing `redact` mints, so a peer named here and a peer named in a
   * tool result come out as the same token.
   */
  handle(type: PlaceholderType, id: string, name?: string): string {
    return this.mint(type, id, name ?? id);
  }

  /** Stable placeholder for a scalar value (real and display are identical). */
  placeholder(type: PlaceholderType, value: string): string {
    return this.mint(type, value, value);
  }

  /** Redact one resource object (or array) of `type` per the allowlist. */
  redact(type: ResourceType, value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.redact(type, v));

    /*
      A nested field is usually an object, but the management API also returns
      bare ids for the same relationships — `destinations: ["d9qsi…"]` instead
      of `destinations: [{id, name}]`. Passing a non-object straight through
      leaked those ids verbatim into the model's context, and out of it into the
      answer. Tokenise them like any other handle; drop them if the kind has no
      handle to tokenise with.
    */
    if (typeof value === "string") {
      const handle = REDACTION[type].handle;
      return handle ? this.mint(handle, value, value) : undefined;
    }

    if (value === null || typeof value !== "object") return value;

    const spec = REDACTION[type];
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    // Collapse id + name into one handle keyed by id (stable), displayed as
    // name — unless the name is a label, in which case only the id is a token
    // and the name goes through as written.
    if (spec.handle) {
      const id = typeof src.id === "string" ? src.id : undefined;
      const name = typeof src.name === "string" ? src.name : undefined;
      const realKey = id ?? name;
      if (realKey) {
        const token = this.mint(spec.handle, realKey, name ?? realKey);
        if (id !== undefined) out.id = token;
        if (name !== undefined) out.name = spec.labelled ? name : token;
      }
    }

    for (const [key, raw] of Object.entries(src)) {
      if (spec.handle && (key === "id" || key === "name")) continue; // handled above
      const rule = spec.transform?.[key];
      if (rule) out[key] = this.applyRule(rule, raw);
      else if (spec.keep.includes(key)) out[key] = raw;
      // else: not allowlisted → dropped.
    }
    return out;
  }

  private applyRule(rule: TransformRule, raw: unknown): unknown {
    if (raw === null || raw === undefined) return raw;
    if (typeof rule === "object" && "nested" in rule)
      return this.redact(rule.nested, raw);
    if (typeof rule === "object" && "array" in rule) {
      return Array.isArray(raw)
        ? raw.map((v) => this.scalar(rule.array, v))
        : raw;
    }
    return this.scalar(rule, raw);
  }

  private scalar(type: PlaceholderType, raw: unknown): unknown {
    return typeof raw === "string" && raw.length
      ? this.placeholder(type, raw)
      : raw;
  }

  /** Replace every known placeholder token in text with its display value. */
  restore(text: string): string {
    if (this.reverse.size === 0) return text;

    /*
      Built from the tokens actually minted, then matched loosely: models drop
      the braces, lower-case the prefix, and write "Peer 1" for `{PEER_1}` when
      they think they're being readable — most visibly in select options, where
      "Peer 1" tells the user nothing. Restricting the pattern to known tokens
      keeps that tolerance from touching ordinary prose.

      A token we never minted is left exactly as it is: that's the model
      referring to something it was never given, and inventing a name for it
      would be worse than showing the token.
    */
    const bodies = [...this.reverse.keys()]
      .map((token) => token.slice(1, -1))
      .sort((a, b) => b.length - a.length);

    // `_` is written as `[ _]` so "Peer 1" matches `{PEER_1}`. Two branches
    // rather than optional braces, so `{ PEER_1 }` loses its braces too.
    const body = `(${bodies.join("|")})`.replace(/_/g, "[ _]");
    const pattern = new RegExp(`\\{\\s*${body}\\s*\\}|\\b${body}\\b`, "gi");

    return text.replace(pattern, (whole, braced?: string, bare?: string) => {
      const matched = braced ?? bare;
      if (!matched) return whole;
      const canonical = `{${matched.replace(/ /g, "_").toUpperCase()}}`;
      return this.reverse.get(canonical)?.display ?? whole;
    });
  }

  /**
   * Resolve a token to the real id to send back to management (for follow-up
   * calls). Accepts the bare form (`PEER_1`, `peer_1`) as well as the canonical
   * `{PEER_1}` — models drop the braces often enough that being strict here
   * would turn a cosmetic slip into a failed tool call.
   */
  resolve(token: string): string | undefined {
    const direct = this.reverse.get(token)?.real;
    if (direct !== undefined) return direct;
    const bare = token
      .trim()
      .replace(/^\{|\}$/g, "")
      .toUpperCase();
    return this.reverse.get(`{${bare}}`)?.real;
  }

  /** Snapshot of token → {real, display}, e.g. to persist alongside the transcript. */
  mapping(): Record<string, RealValue> {
    return Object.fromEntries(this.reverse);
  }
}

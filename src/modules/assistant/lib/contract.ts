// Wire contract with the agent: everything here must match what the server uses.

export const ROUTE_PREFIX = "/assistant/v1";

export const SESSION_PATH = `${ROUTE_PREFIX}/session`;

export const PREWARM_PATH = `${ROUTE_PREFIX}/prewarm`;

export const SESSION_ID_HEADER = "x-assistant-session-id";

export const CHAT_HEADER = "x-assistant-chat";

export const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export const PAGE_CONTEXT_HEADER = "x-assistant-page-context";

// A closed list: the model is told to trust `kind`,
// so whoever sets the header must not be able to widen it.
export const PAGE_CONTEXT_KINDS = [
  "peer",
  "group",
  "network",
  "user",
  "settings",
  "integration",
] as const;

export type PageContextKind = (typeof PAGE_CONTEXT_KINDS)[number];

export interface PageContext {
  kind: PageContextKind;
  ref?: string;
  label?: string;
}

export const PAGE_CONTEXT_MAX_CHARS = 512;

// Line breaks and bidi controls, which would let a resource name smuggle a second "turn" into a trusted marker.
// The builder must strip exactly what the parser rejects.
const FORBIDDEN_IN_ATTRIBUTE =
  /[\r\n\u2028\u2029\u0085\u000b\u000c\u0000\u202a-\u202e\u2066-\u2069]/g;

const escapeAttribute = (value: string): string =>
  value
    .replace(FORBIDDEN_IN_ATTRIBUTE, " ")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const unescapeAttribute = (value: string): string =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

export function buildPageContextMarker(context: PageContext): string {
  const render = (parts: { ref?: string; label?: string }): string => {
    const attributes = [`kind="${context.kind}"`];
    if (parts.ref) attributes.push(`ref="${escapeAttribute(parts.ref)}"`);
    if (parts.label) attributes.push(`label="${escapeAttribute(parts.label)}"`);
    return `<page-context ${attributes.join(" ")} />`;
  };

  const marker = render(context);
  if (marker.length <= PAGE_CONTEXT_MAX_CHARS) return marker;

  // The agent drops an oversized marker whole, so the label is trimmed instead;
  // rebuilt rather than sliced, so the result cannot end mid-entity.
  let ref = context.ref;
  let base = render({ ref });
  if (base.length > PAGE_CONTEXT_MAX_CHARS) {
    // Half an id names a different resource, so an oversized `ref` is dropped, not trimmed.
    ref = undefined;
    base = render({});
  }
  const room = PAGE_CONTEXT_MAX_CHARS - base.length - ' label=""'.length;
  if (!context.label || room <= 0) return base;

  // Grown by code point so the trim never ends on a lone surrogate, which `encodeURIComponent` throws on.
  let trimmed = "";
  for (const point of context.label) {
    const next = trimmed + point;
    if (escapeAttribute(next).length > room) break;
    trimmed = next;
  }
  return trimmed ? render({ ref, label: trimmed }) : base;
}

// Attributes are separated by space or tab only: `\s+` would admit a marker across two lines.
const FORBIDDEN_CLASS = String.raw`\r\n\u2028\u2029\u0085\u000b\u000c\u0000\u202a-\u202e\u2066-\u2069`;
const MARKER = new RegExp(String.raw`^<page-context((?:[ \t]+[a-z]+="[^"<>${FORBIDDEN_CLASS}]*")+)[ \t]*\/>$`);
const ATTRIBUTE = new RegExp(String.raw`[ \t]+([a-z]+)="([^"<>${FORBIDDEN_CLASS}]*)"`, "g");
const KNOWN_ATTRIBUTES = new Set(["kind", "ref", "id", "label"]);

export function parsePageContextMarker(value: string): PageContext | null {
  if (value.length > PAGE_CONTEXT_MAX_CHARS) return null;
  const tag = MARKER.exec(value.trim());
  if (!tag?.[1]) return null;

  const attributes = new Map<string, string>();
  for (const [, name, raw] of tag[1].matchAll(ATTRIBUTE)) {
    if (!name || raw === undefined) return null;
    if (attributes.has(name)) return null;
    if (!KNOWN_ATTRIBUTES.has(name)) return null;
    attributes.set(name, unescapeAttribute(raw));
  }

  const kind = attributes.get("kind");
  if (!kind || !(PAGE_CONTEXT_KINDS as readonly string[]).includes(kind)) {
    return null;
  }
  if (attributes.has("ref") && attributes.has("id")) return null;

  const ref = attributes.get("ref") ?? attributes.get("id");
  const label = attributes.get("label");
  return {
    kind: kind as PageContextKind,
    ...(ref ? { ref } : {}),
    ...(label ? { label } : {}),
  };
}

export interface ToolOutcome {
  ok: boolean;
  content: string;
}

export interface BrowserResults {
  browserResults: (ToolOutcome & { requestId: string; toolName: string })[];
}

export const BROWSER_RESULT_MAX_CHARS = 300_000;

export function isOmittedOutput(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { omitted?: unknown }).omitted === true
  );
}

// Carried results are already tokenised when they leave the browser.
export interface MessageContext {
  carriedResults: { toolName: string; ok: boolean; content: string }[];
}

export const READ_TOOLS: readonly string[] = ["netbird_api", "audit_events", "account_search"];

export const CARRIED_RESULTS_MAX = 8;

export const CARRIED_RESULTS_MAX_CHARS = 300_000;

// UTF-8 bytes as sent, not characters: non-ASCII names and JSON escaping make a body longer than its text.
export const CHAT_REQUEST_MAX_BYTES = 1024 * 1024;

export const BROWSER_RESULTS_MAX_PER_REQUEST = 16;

export const MODEL_REFUSALS = {
  budgetSpent: "You've reached today's assistant usage limit. Try again tomorrow, or ask your administrator.",
  turnTooLong: "That took more steps than one answer may. Ask again, or split the question up.",
  accountMismatch: "This chat belongs to another account. Start a new chat.",
  accountQuotaSpent:
    "This account has reached its assistant spending limit for this period. Contact support@netbird.io to raise it.",
} as const;

// One code for someone else's, expired and unknown sessions, so it says nothing about which.
export const SESSION_UNAVAILABLE_CODE = "session_unavailable";

export const ACCESS_PATH = `${ROUTE_PREFIX}/access`;

export type AccessResponse = { ok: boolean };

export type ToolKind = "browser" | "server";

export interface ToolManifestEntry {
  kind: ToolKind;
  label: string;
  row?: false;
}

// Wire names must match the agent's tool filenames.
export const TOOL_MANIFEST: Record<string, ToolManifestEntry> = {
  netbird_api: {
    kind: "browser",
    label: "Read the NetBird API",
  },
  audit_events: {
    kind: "browser",
    label: "Read activity events",
  },
  account_search: {
    kind: "browser",
    label: "Look up",
    row: false,
  },
  docs_search: {
    kind: "server",
    label: "Read the docs",
  },

  render_component: {
    kind: "server",
    label: "Prepare a view",
    row: false,
  },

  ask_question: {
    kind: "server",
    label: "Ask a question",
    row: false,
  },

  dashboard_page_redirect: {
    kind: "browser",
    label: "Navigate to",
  },

  control_center_state: { kind: "browser", label: "Read the canvas" },
  control_center_navigate: { kind: "browser", label: "Open the control center" },
  control_center_draft: { kind: "browser", label: "Set up a draft" },
  control_center_add: { kind: "browser", label: "Add to draft" },
  control_center_connect: { kind: "browser", label: "Connect" },
  control_center_node: { kind: "browser", label: "Edit the draft" },
  control_center_policy: { kind: "browser", label: "Edit policy" },
  control_center_canvas: { kind: "browser", label: "Arrange the canvas" },
};

export const OPERATION_LABELS: Record<string, Omit<ToolManifestEntry, "kind">> = {
  get_api_peers: {
    label: "Read peers",
  },
  get_api_peers_peerId: {
    label: "Read peer details",
  },
  get_api_groups: {
    label: "Read groups",
  },
  get_api_policies: {
    label: "Read access policies",
  },
  get_api_routes: {
    label: "Read networks & routes",
  },
  get_api_dns_nameservers: {
    label: "Read DNS configuration",
  },
  get_api_setup_keys: {
    label: "Read setup keys",
  },
  get_api_users: {
    label: "Read users",
  },
  get_api_users_current: {
    label: "Read your profile",
  },
  get_api_accounts: {
    label: "Read account settings",
  },
  get_api_posture_checks: {
    label: "Read posture checks",
  },
  get_api_networks: {
    label: "Read networks",
  },
  get_api_dns_settings: {
    label: "Read DNS settings",
  },
  get_api_events_network_traffic: {
    label: "Read traffic events",
  },
  get_api_events_proxy: {
    label: "Read reverse proxy access logs",
  },
  get_api_networks_routers: {
    label: "Read network routers",
  },
  get_api_networks_networkId_resources: {
    label: "Read network resources",
  },
  get_api_dns_zones: {
    label: "Read DNS zones",
  },
  get_api_reverse_proxies_services: {
    label: "Read reverse proxy services",
  },
  get_api_reverse_proxies_clusters: {
    label: "Read proxy clusters",
  },
  get_api_reverse_proxies_domains: {
    label: "Read custom domains",
  },
  get_api_agent_network_providers: {
    label: "Read AI providers",
  },
  get_api_agent_network_policies: {
    label: "Read agent policies",
  },
  get_api_agent_network_guardrails: {
    label: "Read guardrails",
  },
  get_api_agent_network_budget_rules: {
    label: "Read global limits",
  },
  get_api_agent_network_settings: {
    label: "Read Agent Network settings",
  },
  get_api_agent_network_access_logs: { label: "Read agent access logs" },
  get_api_agent_network_access_log_sessions: { label: "Read agent sessions" },
  get_api_agent_network_consumption: { label: "Read agent limit consumption" },
  get_api_agent_network_usage_overview: { label: "Read agent usage" },
  get_api_agent_network_catalog_providers: { label: "Read the AI provider catalog" },
  get_api_peers_peerId_accessible_peers: { label: "Read which peers a peer can reach" },
  get_api_users_invites: { label: "Read user invites" },
  get_api_users_userId_tokens: { label: "Read access tokens" },
  get_api_reverse_proxies_proxy_tokens: { label: "Read proxy tokens" },
  get_api_identity_providers: { label: "Read identity providers" },
  get_api_integrations_azure_idp: { label: "Read Azure AD sync" },
  get_api_integrations_google_idp: { label: "Read Google Workspace sync" },
  get_api_integrations_okta_scim_idp: { label: "Read Okta SCIM sync" },
  get_api_integrations_scim_idp: { label: "Read SCIM sync" },
  get_api_event_streaming: { label: "Read event streaming" },
  get_api_integrations_notifications_channels: { label: "Read notification channels" },
  get_api_integrations_edr_falcon: { label: "Read CrowdStrike Falcon integration" },
  get_api_integrations_edr_fleetdm: { label: "Read FleetDM integration" },
  get_api_integrations_edr_huntress: { label: "Read Huntress integration" },
  get_api_integrations_edr_intune: { label: "Read Intune integration" },
  get_api_integrations_edr_sentinelone: { label: "Read SentinelOne integration" },
  get_api_peers_edr_bypassed: { label: "Read EDR-bypassed peers" },
  get_api_integrations_billing_subscription: { label: "Read your subscription" },
  get_api_integrations_billing_plans: { label: "Read plans" },
  get_api_integrations_billing_usage: { label: "Read billing usage" },
  get_api_integrations_billing_invoices: { label: "Read invoices" },
  get_api_integrations_msp_tenants: { label: "Read tenants" },
  get_api_instance_version: { label: "Read the NetBird version" },
};

export const rendersTrailRow = (name: string): boolean =>
  !Object.hasOwn(TOOL_MANIFEST, name) || TOOL_MANIFEST[name]?.row !== false;

const namesOfKind = (kind: ToolKind): string[] =>
  Object.entries(TOOL_MANIFEST)
    .filter(([, entry]) => entry.kind === kind)
    .map(([name]) => name);

export const BROWSER_TOOLS: readonly string[] = namesOfKind("browser");

// Scrubbed from typed text before it leaves the browser. Order matters: enveloping shapes
// (PEM, JWT, credential URLs) go first, or the narrower patterns tear them apart.
// Lookbehinds and bounded runs replace `\b` and length caps to stay linear on a hostile paste without letting long secrets through.
export const SECRET_PATTERNS: readonly RegExp[] = [
  // PEM private keys.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[^-]|-(?!----))*-----END [A-Z ]*PRIVATE KEY-----/g,
  // SSH public keys.
  /\b(?:ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp\d{3})\s+[A-Za-z0-9+/]{40,}={0,3}/g,
  // JWTs.
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{6,}(?![A-Za-z0-9_-])/g,
  // NetBird personal access tokens.
  /\bnbp_[A-Za-z0-9]{8,}\b/g,
  // AWS, GitHub, GitLab, Slack, OpenAI, Google, Stripe, npm, PyPI, SendGrid, Twilio, Mailgun.
  /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}|npm_[A-Za-z0-9]{36}|pypi-[A-Za-z0-9_-]{50,}|SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}|SK[a-f0-9]{32}|key-[a-f0-9]{32})\b/g,
  /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/g,
  // URLs with embedded credentials, DB DSNs included.
  /(?<![a-z0-9+.-])[a-z][a-z0-9+.-]*:\/\/[^\s:@/"']+:[^\s@/"']+@[^\s"'<>]+/gi,
  // Secret assignments from env files and configs.
  // A value under 257 characters must carry a digit, so prose like "the secret: management" cannot match.
  /(?<![\w-])[\w-]*(?:password|passwd|pwd|secret|token|api[_-]?key|enc[_-]?key|auth[_-]?key|access[_-]?key|account[_-]?key)["']?\s*[=:]\s*["']?(?:[^\s"',;]{257,}|(?=[^\s"',;]{0,255}\d)[^\s"',;]{8,256})/gi,
  // Opaque bearer tokens.
  /\bBearer\s+[A-Za-z0-9~_+/.-]{20,}={0,2}/g,
  // WireGuard keys: exactly 32 bytes of base64 (43 chars + padding).
  /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=(?![A-Za-z0-9+/=])/g,
];

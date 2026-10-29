/**
 * Wire contract between the agent and the dashboard SDK.
 * Both sides import from this module, so neither can drift from the other.
 */

/** Every route the assistant serves sits under this prefix. */
export const ROUTE_PREFIX = "/assistant/v1";

/** Unauthenticated: whether the service is up at all. */
export const HEALTH_PATH = `${ROUTE_PREFIX}/health`;

/** `POST` starts a chat; `/:sessionId` sends to it, and `/cancel`, `/reset` and `/stream` act on it. */
export const SESSION_PATH = `${ROUTE_PREFIX}/session`;

/**
 * `POST` creates the chat's session before its first message, so the first
 * answer does not wait for the session to start. Idempotent for one chat id:
 * a chat that already has a session gets that session back. A 501 means this
 * agent cannot prewarm, and the first message creates the session instead.
 * Its own path: under `/session` it would be a second `POST /session/:id`.
 */
export const PREWARM_PATH = `${ROUTE_PREFIX}/prewarm`;

/** Response header naming the session a request reached. */
export const SESSION_ID_HEADER = "x-assistant-session-id";

/** Response header on a bounded stream: the index of the last event it will send. */
export const STREAM_TAIL_INDEX_HEADER = "x-assistant-stream-tail-index";

/**
 * Header naming the chat on every request: a random id the browser mints per chat.
 * The agent finds the session from it together with the verified user and account,
 * so a session is only reachable by the user who started it.
 */
export const CHAT_HEADER = "x-assistant-chat";

export const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

/** Header carrying the page the user is looking at on each chat POST. */
export const PAGE_CONTEXT_HEADER = "x-assistant-page-context";

/**
 * The page types a marker may claim.
 * Closed on purpose: the model is told to trust `kind`,
 * which only holds while this list, not whoever sets the header, decides what it can be.
 */
export const PAGE_CONTEXT_KINDS = [
  "peer",
  "group",
  "network",
  "user",
  "settings",
  "integration",
] as const;

export type PageContextKind = (typeof PAGE_CONTEXT_KINDS)[number];

/** What the page-context header claims the user is looking at. */
export interface PageContext {
  kind: PageContextKind;
  /** The resource the page is about: an id or a name. */
  ref?: string;
  /** Its display name, when the dashboard has one. */
  label?: string;
}

/**
 * Upper bound on the decoded header value, in characters.
 * Comfortably above the longest marker real NetBird data produces,
 * since the management API caps resource names well below it.
 */
export const PAGE_CONTEXT_MAX_CHARS = 512;

/*
  Characters an attribute value may not contain.
  Each either reads as a new line to a model or reorders the text it sees,
  which is how a resource name would smuggle a second "turn" into a trusted marker.
  The builder strips exactly what the parser rejects.
*/
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

/** Renders the page-context marker the model reads. */
export function buildPageContextMarker(context: PageContext): string {
  const render = (parts: { ref?: string; label?: string }): string => {
    const attributes = [`kind="${context.kind}"`];
    if (parts.ref) attributes.push(`ref="${escapeAttribute(parts.ref)}"`);
    if (parts.label) attributes.push(`label="${escapeAttribute(parts.label)}"`);
    return `<page-context ${attributes.join(" ")} />`;
  };

  const marker = render(context);
  if (marker.length <= PAGE_CONTEXT_MAX_CHARS) return marker;

  /*
    The agent drops an oversized marker whole, losing `kind` too,
    so the label (the least load-bearing part) is trimmed instead.
    It is rebuilt rather than sliced, so the result cannot end mid-entity.
  */
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

/*
  One self-closing tag and nothing else.
  Values exclude `"`, `<`, `>` and FORBIDDEN_IN_ATTRIBUTE,
  so no value can close the tag early, open a second one, or split it across two turns.
  Attributes are separated by space or tab only, since `\s+` would admit a marker across two lines.
*/
const FORBIDDEN_CLASS = String.raw`\r\n\u2028\u2029\u0085\u000b\u000c\u0000\u202a-\u202e\u2066-\u2069`;
const MARKER = new RegExp(String.raw`^<page-context((?:[ \t]+[a-z]+="[^"<>${FORBIDDEN_CLASS}]*")+)[ \t]*\/>$`);
const ATTRIBUTE = new RegExp(String.raw`[ \t]+([a-z]+)="([^"<>${FORBIDDEN_CLASS}]*)"`, "g");
const KNOWN_ATTRIBUTES = new Set(["kind", "ref", "id", "label"]);

/**
 * Returns the marker's parts, or null when the value is not a well-formed marker.
 * The agent drops a value that fails here rather than forward text of unknown origin as the dashboard speaking.
 * `id` is accepted as a spelling of `ref`.
 */
export function parsePageContextMarker(value: string): PageContext | null {
  // The builder holds to the cap, so anything longer was not built by it.
  if (value.length > PAGE_CONTEXT_MAX_CHARS) return null;
  const tag = MARKER.exec(value.trim());
  if (!tag?.[1]) return null;

  const attributes = new Map<string, string>();
  for (const [, name, raw] of tag[1].matchAll(ATTRIBUTE)) {
    if (!name || raw === undefined) return null;
    // A repeated attribute has two readings, and a marker has one.
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

/** Outcome shape every client executor resolves with (never throws). */
export interface ToolOutcome {
  ok: boolean;
  /** Human/model-readable result body (JSON string or prose). */
  content: string;
}

/**
 * A browser tool parks the turn on a tool approval. The browser runs it, answers
 * `approve` (or `cancel` when it failed) and sends what it found as this
 * `clientContext`, which the model reads on its next call.
 */
export interface BrowserResults {
  browserResults: (ToolOutcome & { requestId: string; toolName: string })[];
}

/**
 * One result, in characters: a few hundred full rows of a list, so a list
 * is almost always read whole. About a third of the model's window.
 */
export const BROWSER_RESULT_MAX_CHARS = 300_000;

/**
 * What the stream carries in place of an output only the model reads: a loaded
 * guide or a docs page. The dashboard renders nothing from those, so the
 * channel sends this stub and the activity row shows the request alone.
 */
export const OMITTED_OUTPUT = { omitted: true } as const;

export function isOmittedOutput(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { omitted?: unknown }).omitted === true
  );
}

/**
 * Account reads the dashboard sends along with a message.
 * eve keeps a browser result for the turn it answered only,
 * so without these a follow-up question would read the account again,
 * a round trip to the browser each time.
 * The dashboard carries the latest reads forward, and the record of the page the user is on,
 * all already tokenised; the agent screens them like any browser result.
 */
export interface MessageContext {
  carriedResults: { toolName: string; ok: boolean; content: string }[];
}

/**
 * The account reads: browser tools the SDK runs itself, through the host's `fetchManagement`,
 * and the only results a message may carry.
 */
export const READ_TOOLS: readonly string[] = ["netbird_api", "audit_events", "account_search"];

/** The most carried results one message may hold. */
export const CARRIED_RESULTS_MAX = 8;

/** Their combined size, in characters; the oldest are dropped first. */
export const CARRIED_RESULTS_MAX_CHARS = 300_000;

/**
 * The agent's cap on one chat request body, in UTF-8 bytes as sent.
 * The browser sizes its results against this rather than in characters,
 * since non-ASCII names and JSON escaping both make a body longer than its text.
 */
// Well under the 4.5 MB a Vercel function takes.
export const CHAT_REQUEST_MAX_BYTES = 1024 * 1024;

/** The most answers, and so browser results, one request may carry; the browser splits a larger batch. */
export const BROWSER_RESULTS_MAX_PER_REQUEST = 16;

/**
 * Why the agent refused a model call, as the turn's failure message.
 * Worded for the user, so the browser shows these as they are.
 */
export const MODEL_REFUSALS = {
  /** The caller's daily model budget, across all their chats, is spent. */
  budgetSpent: "You've reached today's assistant usage limit. Try again tomorrow, or ask your administrator.",
  /** One turn ran into the per-turn model call cap. */
  turnTooLong: "That took more steps than one answer may. Ask again, or split the question up.",
  /** The caller's account is not the one the chat was started for, so nobody can be charged for it. */
  accountMismatch: "This chat belongs to another account. Start a new chat.",
  /** The account's spend quota on the AI Gateway is used up for the period. */
  accountQuotaSpent:
    "This account has reached its assistant spending limit for this period. Contact support@netbird.io to raise it.",
} as const;

/**
 * The 403 code for a session the caller cannot reach, whether it is someone
 * else's, expired or unknown; one code so it says nothing about which. The
 * browser keys its "start a fresh chat" recovery on it.
 */
export const SESSION_UNAVAILABLE_CODE = "session_unavailable";

/**
 * Whether the caller's account may use the assistant, answered as a 200 with
 * an AccessResponse either way, since an account that is not enabled is the
 * common case rather than an error. Needs the user's bearer; a missing or
 * invalid one is still a 401. The agent alone decides, so the dashboard asks
 * rather than knowing.
 */
export const ACCESS_PATH = `${ROUTE_PREFIX}/access`;

export type AccessResponse = { ok: boolean };

/**
 * The 403 code for an account the assistant is not enabled for, on every
 * route but the access check.
 */
export const ACCOUNT_NOT_ALLOWED_CODE = "account_not_allowed";

// Every wire tool the assistant can call, and where it runs.
// Wire names must match the agent's tool filenames.

export type ToolKind = "browser" | "server";

export interface ToolManifestEntry {
  kind: ToolKind;
  /** Trail label, running or done: present tense (or the whole phrase, for canvas tools). */
  label: string;
  /**
   * False when the call renders as a card or inline component rather than a trail row.
   * The status line names only tools without a row, since a row already announces itself.
   */
  row?: false;
}

export const TOOL_MANIFEST: Record<string, ToolManifestEntry> = {
  // Account reads run in the dashboard, with the user's own session.
  // The trail labels each call by its `operation` (OPERATION_LABELS).
  netbird_api: {
    kind: "browser",
    label: "Read the NetBird API",
  },
  audit_events: {
    kind: "browser",
    label: "Read activity events",
  },
  // The quick look-up a typed name gets before anything is read in full;
  // no row, since it is the agent finding its footing rather than an answer's step.
  account_search: {
    kind: "browser",
    label: "Look up",
    row: false,
  },
  // One label covers both listing a source's pages and reading one.
  docs_search: {
    kind: "server",
    label: "Read the docs",
  },

  // Server-executed even though its product is UI: the host renders the card from the call's arguments.
  render_component: {
    kind: "server",
    label: "Prepare a view",
    row: false,
  },

  // eve's built-in question, rendered by the host from `pendingInput`.
  ask_question: {
    kind: "server",
    label: "Ask a question",
    row: false,
  },

  dashboard_page_redirect: {
    kind: "browser",
    label: "Navigate to",
  },

  // Canvas labels are one imperative phrase, so the trail reads as moves.
  control_center_state: { kind: "browser", label: "Read the canvas" },
  control_center_navigate: { kind: "browser", label: "Open the control center" },
  control_center_draft: { kind: "browser", label: "Set up a draft" },
  control_center_add: { kind: "browser", label: "Add to draft" },
  control_center_connect: { kind: "browser", label: "Connect" },
  control_center_node: { kind: "browser", label: "Edit the draft" },
  control_center_policy: { kind: "browser", label: "Edit policy" },
  control_center_canvas: { kind: "browser", label: "Arrange the canvas" },
};

/** Trail labels for `netbird_api` calls, keyed by their `operation`. */
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
};

/**
 * Whether the dashboard renders this call as a row in the activity trail.
 * Unknown names answer true, since the trail's fallback renders them.
 */
export const rendersTrailRow = (name: string): boolean =>
  !Object.hasOwn(TOOL_MANIFEST, name) || TOOL_MANIFEST[name]?.row !== false;

const namesOfKind = (kind: ToolKind): string[] =>
  Object.entries(TOOL_MANIFEST)
    .filter(([, entry]) => entry.kind === kind)
    .map(([name]) => name);

/** Tools the browser executes when a `browser-dispatch` arrives. */
export const BROWSER_TOOLS: readonly string[] = namesOfKind("browser");

/** Tools the agent executes itself. */
export const SERVER_TOOLS: readonly string[] = namesOfKind("server");

/*
  Credentials that identify themselves by shape, scrubbed from typed text before it leaves the browser.
  The agent prepends these, in this order, to its own redaction patterns (agent/lib/redaction.ts),
  so this is the single declaration.
  Order matters: PEM blocks, JWTs and credential URLs contain runs the narrower patterns would tear apart,
  so the enveloping shapes go first.

  Several patterns use a lookbehind or a delimiter-bounded run instead of `\b` or a length cap.
  These run on a single-threaded event loop, so a quadratic pattern lets one hostile paste freeze the tab or the agent,
  and a length cap would let a long enough credential through unredacted.
*/
export const SECRET_PATTERNS: readonly RegExp[] = [
  // The body may not cross a run of five hyphens (an armor line), which keeps it linear without a cap.
  // One to four hyphens are still body, so `Proc-Type`/`DEK-Info` headers stay inside the match.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[^-]|-(?!----))*-----END [A-Z ]*PRIVATE KEY-----/g,
  // SSH public keys: the base64 body can embed hardware-derived material.
  /\b(?:ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp\d{3})\s+[A-Za-z0-9+/]{40,}={0,3}/g,
  // JWTs: three base64url segments, header always starts with eyJ.
  // Lookarounds rather than `\b`: a `-` is both a word boundary and part of the run, so `\b` gave every `-eyJ` its own start.
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{6,}(?![A-Za-z0-9_-])/g,
  // NetBird personal access tokens.
  /\bnbp_[A-Za-z0-9]{8,}\b/g,
  // AWS, GitHub, GitLab, Slack, OpenAI, Google, Stripe, npm, PyPI, SendGrid, Twilio, Mailgun.
  /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|(?:sk|pk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}|npm_[A-Za-z0-9]{36}|pypi-[A-Za-z0-9_-]{50,}|SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}|SK[a-f0-9]{32}|key-[a-f0-9]{32})\b/g,
  /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/g,
  // Any URL with embedded credentials, DB DSNs included; the whole URL is the secret.
  // The lookbehind gives the scheme run one start, where `\b` would rescan it after every hyphen.
  /(?<![a-z0-9+.-])[a-z][a-z0-9+.-]*:\/\/[^\s:@/"']+:[^\s@/"']+@[^\s"'<>]+/gi,
  // Secret assignments from pasted env files and configs.
  // The key-name lookbehind keeps `[\w-]*` linear, as for URLs above (a 128KB paste once took ~57s).
  // A value of 257+ delimiter-free characters is taken whole, since prose never produces one;
  // a shorter value must carry a digit, so prose like "the secret: management" cannot match.
  /(?<![\w-])[\w-]*(?:password|passwd|pwd|secret|token|api[_-]?key|enc[_-]?key|auth[_-]?key|access[_-]?key|account[_-]?key)["']?\s*[=:]\s*["']?(?:[^\s"',;]{257,}|(?=[^\s"',;]{0,255}\d)[^\s"',;]{8,256})/gi,
  // Opaque bearer tokens; JWTs were already taken by the rule above.
  /\bBearer\s+[A-Za-z0-9~_+/.-]{20,}={0,2}/g,
  // WireGuard keys: exactly 32 bytes of base64 (43 chars + padding).
  /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=(?![A-Za-z0-9+/=])/g,
];

/**
 * Replaces every credential-shaped value with `[SECRET_n]`.
 * The counter is per call: these tokens are never restored,
 * they only tell the model and the user that something was withheld.
 */
export function scrubSecrets(text: string): { text: string; found: boolean } {
  let out = text;
  let n = 0;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, () => {
      n += 1;
      return `[SECRET_${n}]`;
    });
  }
  return { text: out, found: n > 0 };
}

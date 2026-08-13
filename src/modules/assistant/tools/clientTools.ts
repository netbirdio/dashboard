/**
 * Client-executed tools — the management-API half of the assistant's tool set.
 *
 * The assistant server never talks to management. When the model wants account
 * data, the server hands us the tool call and ends its turn; we execute it here
 * with the user's own JWT (so management's RBAC still bounds everything), redact
 * the result through the shared allowlist, and send only placeholders back.
 *
 * The registry is an exhaustive map keyed by the server's tool names
 * (netbird-assistant `src/llm/tools.ts`, `runtime: "client"`). Server-executed
 * tools (search_docs, fetch_doc, get_api_reference, render_component, ask_user) are
 * deliberately absent — the server runs those itself and we only ever see their
 * progress events.
 */
import type { ResourceType } from "../privacy/redaction";
import {
  CC_TOOL_LABELS,
  isControlCenterTool,
} from "./controlCenterTools";

export interface ClientTool {
  /** Management API path, relative to `<apiOrigin>/api`. */
  path: (input: Record<string, unknown>) => string;
  /**
   * Redaction spec to apply to the response. `undefined` means the result is
   * already free of identifiers and passes through as-is.
   */
  resource?: ResourceType;
  /** Narrow the raw response before redaction (e.g. pull `.settings` out). */
  select?: (raw: unknown) => unknown;
}

/** `GET /accounts` returns a list; the model only ever wants the settings object. */
const firstAccountSettings = (raw: unknown): unknown =>
  Array.isArray(raw) ? (raw[0] as any)?.settings : (raw as any)?.settings;

export const CLIENT_TOOLS: Record<string, ClientTool> = {
  list_peers: { path: () => "/peers", resource: "peer" },
  get_peer: {
    path: (i) => `/peers/${encodeURIComponent(String(i.peer_id))}`,
    resource: "peer",
  },
  list_groups: { path: () => "/groups", resource: "group" },
  list_policies: { path: () => "/policies", resource: "policy" },
  list_routes: { path: () => "/routes", resource: "route" },
  list_nameserver_groups: {
    path: () => "/dns/nameservers",
    resource: "nameserver_group",
  },
  list_setup_keys: { path: () => "/setup-keys", resource: "setup_key" },
  list_users: { path: () => "/users", resource: "user" },
  get_account_settings: {
    path: () => "/accounts",
    resource: "account_settings",
    select: firstAccountSettings,
  },
  list_events: { path: () => "/events/audit", resource: "event" },
};

/**
 * The one client tool that doesn't read anything: it drives the dashboard.
 *
 * Kept apart from `CLIENT_TOOLS` because it has nothing in common with them —
 * no path to GET, no response to redact — and folding it in would have meant a
 * fake `path` and a branch in the executor either way.
 */
export const OPEN_PAGE_TOOL = "open_page";

/**
 * Where each `page` value goes. Detail pages take the id the model passed
 * (already resolved from its placeholder by the executor); `settings` and
 * `integrations` take a tab. Anything the model asks for that isn't here is
 * refused rather than guessed at — a wrong `router.push` moves the user's
 * screen for no reason.
 */
const PAGES: Record<string, (input: Record<string, unknown>) => string | null> =
  {
    peers: () => "/peers",
    peer: (i) => detail("/peer", i.id),
    groups: () => "/groups",
    group: (i) => detail("/group", i.id),
    access_control: () => "/access-control",
    posture_checks: () => "/posture-checks",
    networks: () => "/networks",
    network: (i) => detail("/network", i.id),
    routes: () => "/network-routes",
    dns: () => "/dns/nameservers",
    setup_keys: () => "/setup-keys",
    users: () => "/team/users",
    user: (i) => detail("/team/user", i.id),
    activity: () => "/events/audit",
    settings: (i) => withTab("/settings", i.tab),
    integrations: (i) => withTab("/integrations", i.tab),
    control_center: () => "/control-center",
  };

const detail = (path: string, id: unknown): string | null =>
  typeof id === "string" && id.trim()
    ? `${path}?id=${encodeURIComponent(id.trim())}`
    : null;

const withTab = (path: string, tab: unknown): string =>
  typeof tab === "string" && tab.trim()
    ? `${path}?tab=${encodeURIComponent(tab.trim())}`
    : path;

/** The href for an `open_page` call, or null if it doesn't name a real page. */
export function pageHref(input: Record<string, unknown>): string | null {
  const page = typeof input.page === "string" ? input.page : "";
  return PAGES[page]?.(input) ?? null;
}

/** The token kind each detail page's `id` must be. */
const DETAIL_ID_TYPE: Record<string, string> = {
  peer: "peer",
  group: "group",
  network: "network",
  user: "user",
};

/** `{PEER_3}` / `PEER_3` → "peer". Real ids carry no `_<n>` suffix, so they don't match. */
const TOKEN_TYPE = /^\{?([a-z_]+)_\d+\}?$/i;

/**
 * Why a navigation would be wrong before it moves the user's screen.
 *
 * The case this exists for: a hostname or address the user typed is a token of
 * its own kind (`{DNS_1}`, `{IP_7}`), and passing one as a peer id resolves to a
 * hostname, which is not an id — the peer page then says "peer not found" and the
 * model has to work out why from a dead end. Naming the mistake turns two wasted
 * turns into one, and the model's next move is the right one.
 */
export function pageIdMismatch(input: Record<string, unknown>): string | null {
  const page = typeof input.page === "string" ? input.page : "";
  const expected = DETAIL_ID_TYPE[page];
  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!expected || !id) return null;

  const type = TOKEN_TYPE.exec(id)?.[1]?.toLowerCase();
  if (!type || type === expected) return null;

  return (
    `${id} is a ${type} value, not a ${expected} id — didn't navigate. ` +
    `List the ${expected}s, find the one carrying ${id}, and open that ${expected}'s own token.`
  );
}

export const isClientTool = (name: string): boolean =>
  name in CLIENT_TOOLS ||
  name === OPEN_PAGE_TOOL ||
  isControlCenterTool(name);

/**
 * Server-run tool that asks the user a question. Its outcome is the card above
 * the composer, so the thread hides its activity row rather than announcing a
 * step whose result is already the loudest thing on screen.
 */
export const ASK_USER_TOOL = "ask_user";

/**
 * Labels for the activity trail, in both tenses: a row narrates what's
 * happening while it runs and what happened once it's done, and "Searching the
 * docs ✓" reads like the search is still going.
 */
export const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  list_peers: { running: "Reading peers", done: "Read peers" },
  get_peer: { running: "Reading peer details", done: "Read peer details" },
  list_groups: { running: "Reading groups", done: "Read groups" },
  list_policies: {
    running: "Reading access policies",
    done: "Read access policies",
  },
  list_routes: {
    running: "Reading networks & routes",
    done: "Read networks & routes",
  },
  list_nameserver_groups: {
    running: "Reading DNS configuration",
    done: "Read DNS configuration",
  },
  list_setup_keys: { running: "Reading setup keys", done: "Read setup keys" },
  list_users: { running: "Reading users", done: "Read users" },
  get_account_settings: {
    running: "Reading account settings",
    done: "Read account settings",
  },
  list_events: {
    running: "Reading activity events",
    done: "Read activity events",
  },
  search_docs: { running: "Searching the docs", done: "Searched the docs" },
  fetch_doc: { running: "Reading documentation", done: "Read documentation" },
  get_api_reference: {
    running: "Looking up the API reference",
    done: "Looked up the API reference",
  },
  render_component: { running: "Preparing a view", done: "Prepared a view" },
  [OPEN_PAGE_TOOL]: { running: "Navigating to", done: "Navigated to" },
  // The control-center canvas tools — they draw rather than read.
  ...CC_TOOL_LABELS,
  [ASK_USER_TOOL]: { running: "Asking a question", done: "Asked a question" },
};

/**
 * The row's text. Falls back to the raw name so a tool the server adds before
 * the dashboard knows about it still renders — in one tense, since there's no
 * way to conjugate an unknown verb.
 */
export const toolLabel = (name: string, running: boolean): string => {
  const label = TOOL_LABELS[name];
  if (!label) return name.replace(/_/g, " ");
  return running ? label.running : label.done;
};

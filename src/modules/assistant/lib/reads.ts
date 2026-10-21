/**
 * The account reads, run in the dashboard with the user's own session.
 *
 * The agent never holds the user's token: it asks, the dashboard reads the
 * management API the way its own pages do, keeps only the fields the
 * operation's profile lists, filters and cuts the result, and the browser tool
 * loop tokenises it before it leaves the tab.
 */
import type { ToolOutcome } from "./contract";
import { fuzzyScore, fuzzySearch } from "./fuzzy";
import { allowlist, PROFILES } from "./profiles";

export type ManagementResponse =
  | { ok: true; body: unknown }
  | { ok: false; status: number; statusText: string };

/**
 * One GET against the management API as the signed-in user, `path` starting
 * at `/api`. With `preferCache`, the host may answer from what its own pages
 * already loaded; without it, the read is fresh, since the model reads again
 * exactly when something may have changed.
 */
export type ManagementFetch = (
  path: string,
  query: Record<string, string>,
  options?: { preferCache?: boolean },
) => Promise<ManagementResponse>;

// A list longer than this is cut so one call cannot fill the context.
const MAX_ROWS = 200;
// The cut a list is sent at when the full one does not fit the request.
const COMPACT_ROWS = 40;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

type Value = string | number | boolean;
type Query = Record<string, Value>;
type Row = Record<string, unknown>;

const asBool = (v: Value) => v === true || v === "true" || v === 1 || v === "1";
const has = (field: unknown, wanted: string) =>
  typeof field === "string" && field.toLowerCase().includes(wanted.toLowerCase());
const same = (field: unknown, wanted: string) =>
  typeof field === "string" && field.toLowerCase() === wanted.toLowerCase();
const named = (row: Row, v: Value) => same(row.id, String(v)) || same(row.name, String(v));

/*
  Filters the management API does not offer, applied after the fetch so a
  question about a subset ("which peers are offline") reads that subset rather
  than the first MAX_ROWS of everything. Keyed by operation, then by the query
  parameter that selects them; these parameters never reach management.
*/
const LOCAL_FILTERS: Record<string, Record<string, (row: Row, value: Value) => boolean>> = {
  get_api_peers: {
    // A name the model has as a token arrives restored to the peer's name, or to its id.
    name: (row, v) => named(row, v) || same(row.hostname, String(v)),
    connected: (row, v) => row.connected === asBool(v),
    login_expired: (row, v) => row.login_expired === asBool(v),
    approval_required: (row, v) => row.approval_required === asBool(v),
    ephemeral: (row, v) => row.ephemeral === asBool(v),
    ssh_enabled: (row, v) => row.ssh_enabled === asBool(v),
    os: (row, v) => has(row.os, String(v)),
    version: (row, v) => has(row.version, String(v)),
    group: (row, v) => Array.isArray(row.groups) && row.groups.some((g: Row) => named(g, v)),
  },
  get_api_groups: { name: named },
  get_api_policies: { name: named },
  get_api_networks: { name: named },
  get_api_users: { email: (row, v) => same(row.email, String(v)), name: named },
};

// The query keys an operation may send to the management API. Anything else
// the model asks for is dropped rather than forwarded: a key such as `account`
// would otherwise reach the API and, for an MSP parent, read another tenant.
const PAGED = ["page", "page_size"];
const REMOTE_QUERY: Record<string, readonly string[]> = {
  // The peers endpoint filters by address server-side; every other peer filter is local.
  get_api_peers: [...PAGED, "ip"],
  get_api_events_network_traffic: [...PAGED, "start_date", "end_date", "destination_id", "source_id", "protocol"],
  get_api_events_proxy: [...PAGED, "start_date", "end_date", "host", "status", "status_code", "source_ip", "user_email", "user_name"],
};

function splitQuery(operation: string, query: Query = {}) {
  const local = LOCAL_FILTERS[operation] ?? {};
  const allowed = REMOTE_QUERY[operation] ?? PAGED;
  const remote: Record<string, string> = {};
  const filters: [(row: Row, value: Value) => boolean, Value][] = [];
  let search: string | undefined;
  for (const [key, value] of Object.entries(query)) {
    if (key === "search") search = String(value);
    else if (Object.hasOwn(local, key)) filters.push([local[key], value]);
    else if (allowed.includes(key)) remote[key] = String(value);
  }
  return { remote, filters, search };
}

const failed = (operation: string, body: Record<string, unknown>): ToolOutcome => ({
  ok: false,
  content: JSON.stringify({ operation, ...body }),
});

// `total` is always there, so a count is read off the result rather than
// taken from a group's `peers_count`, which counts something else.
const listResult = (operation: string, rows: unknown[], total: number, cap: number, note?: string) =>
  JSON.stringify({
    operation,
    total,
    ...(total > cap ? { shown: cap } : {}),
    ...(note ? { note } : {}),
    data: rows.slice(0, cap),
  });

export interface NetbirdApiInput {
  operation?: unknown;
  id?: unknown;
  query?: unknown;
}

/** `netbird_api`: one allowlisted read, with the filters and the search management lacks. */
export async function readNetbirdApi(
  input: NetbirdApiInput,
  fetch: ManagementFetch,
  options?: { preferCache?: boolean },
): Promise<ToolOutcome> {
  const operation = typeof input.operation === "string" ? input.operation : "";
  const op = Object.hasOwn(PROFILES, operation) ? PROFILES[operation] : undefined;
  if (!op) return failed(operation, { error: "Unknown operation." });
  const id = typeof input.id === "string" ? input.id : undefined;
  if (op.path.includes("{id}") && (!id || !ID.test(id))) {
    return failed(operation, { error: "This operation needs the resource's `id`, as a result gave it." });
  }
  const path = op.path.replace("{id}", id ?? "");
  const query = input.query && typeof input.query === "object" && !Array.isArray(input.query) ? (input.query as Query) : {};
  const { remote, filters, search } = splitQuery(operation, query);

  let res: ManagementResponse;
  try {
    res = await fetch(path, remote, options);
  } catch {
    return failed(operation, { error: "The account could not be read just now." });
  }
  if (!res.ok) return failed(operation, { status: res.status, statusText: res.statusText });

  const data = allowlist(op.select ? op.select(res.body) : res.body, op.profile);
  if (!Array.isArray(data)) return { ok: true, content: JSON.stringify({ operation, data }) };

  let rows = (data as Row[]).filter((row) => filters.every(([matches, value]) => matches(row, value)));
  if (search) rows = fuzzySearch(rows, search);
  const note = search && rows.length === 0 ? "Nothing matched the search; try fewer or different words." : undefined;
  return {
    ok: true,
    content: listResult(operation, rows, rows.length, MAX_ROWS, note),
    ...(rows.length > COMPACT_ROWS
      ? { compact: listResult(operation, rows, rows.length, COMPACT_ROWS, "Cut to fit; narrow the query to see the rest.") }
      : {}),
  };
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const MAX_AUDIT_ROWS = 50;
// A match this good or better counts when filtering the audit log by a name.
const AUDIT_MATCH = 50;

/*
  High-volume system activity that drowns every real change. Left out unless
  the caller's `activity` filter names it, because "what changed" never means
  "every usage report and every sign-in".
*/
const NOISE = [/^billing\./, /^dashboard\.login$/];

interface RawEvent {
  id?: string | number;
  activity?: string;
  activity_code?: string;
  initiator_name?: string;
  initiator_email?: string;
  meta?: Record<string, unknown> | null;
  timestamp?: string;
}

interface AuditEventRow {
  /** Opens the audit log on this row: `dashboard_page_redirect` page `activity`. */
  id: string;
  timestamp: string;
  activity: string;
  activity_code: string;
  initiator_name?: string;
  initiator_email?: string;
  /** Name of a policy, group, network, route, setup key, resource… */
  target?: string;
  /** A peer the event is about. */
  peer?: string;
  /** A person a `user.*` event is about. */
  user?: string;
  /** The group in a membership change (`peer.group.add`, `setupkey.group.add`). */
  group?: string;
  old_name?: string;
  new_name?: string;
  /** A user the event is about (invites, service users, tokens). */
  email?: string;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

function toRow(e: RawEvent): AuditEventRow {
  const meta = e.meta ?? {};
  const code = e.activity_code ?? "";
  const aboutPeer = code.startsWith("peer.") || code.startsWith("user.peer.");
  const aboutUser = !aboutPeer && code.startsWith("user.");
  const name = str(meta.name);
  return {
    id: e.id === undefined ? "" : String(e.id),
    timestamp: e.timestamp ?? "",
    activity: e.activity ?? "",
    activity_code: code,
    initiator_name: str(e.initiator_name),
    initiator_email: str(e.initiator_email),
    target: aboutPeer || aboutUser ? undefined : (name ?? str(meta.network_name) ?? str(meta.resource_name)),
    user: aboutUser ? name : undefined,
    peer: aboutPeer ? (name ?? str(meta.fqdn) ?? str(meta.peer_fqdn)) : undefined,
    group: str(meta.group),
    old_name: str(meta.old_name),
    new_name: str(meta.new_name),
    email: str(meta.email),
  };
}

const matchesAny = (fields: (string | undefined)[], wanted: string) =>
  fields.some((f) => f !== undefined && fuzzyScore(wanted, f) >= AUDIT_MATCH);

export interface AuditEventsInput {
  days?: unknown;
  target?: unknown;
  activity?: unknown;
  initiator?: unknown;
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** `audit_events`: the account's audit log, cut to the rows the question is about. */
export async function readAuditEvents(input: AuditEventsInput, fetch: ManagementFetch): Promise<ToolOutcome> {
  let res: ManagementResponse;
  try {
    res = await fetch("/api/events/audit", {});
  } catch {
    return { ok: false, content: "The audit log could not be read just now." };
  }
  if (!res.ok) return { ok: false, content: JSON.stringify({ status: res.status, error: res.statusText }) };
  const events = Array.isArray(res.body) ? (res.body as RawEvent[]) : [];

  const days =
    typeof input.days === "number" && Number.isInteger(input.days)
      ? Math.min(MAX_DAYS, Math.max(1, input.days))
      : DEFAULT_DAYS;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const target = text(input.target, 200);
  const activity = text(input.activity, 100)?.toLowerCase();
  const initiator = text(input.initiator, 200);

  const matched: AuditEventRow[] = [];
  for (const e of events) {
    const at = Date.parse(e.timestamp ?? "");
    if (!Number.isFinite(at) || at < since) continue;
    const code = e.activity_code ?? "";
    const row = toRow(e);
    if (activity) {
      if (![row.activity, code].some((f) => f.toLowerCase().includes(activity))) continue;
    } else if (NOISE.some((re) => re.test(code))) {
      continue;
    }
    if (target && !matchesAny([row.target, row.peer, row.user, row.group, row.old_name, row.new_name, row.email], target)) {
      continue;
    }
    if (initiator && !matchesAny([row.initiator_name, row.initiator_email], initiator)) continue;
    matched.push(row);
  }

  // The API returns newest first; keep that order so the cut drops the oldest.
  const result = (cap: number) =>
    JSON.stringify({
      window_days: days,
      matched: matched.length,
      shown: Math.min(cap, matched.length),
      ...(matched.length > cap ? { note: "Newest rows only — narrow with target, activity or initiator to see the rest." } : {}),
      rows: matched.slice(0, cap),
    });
  return {
    ok: true,
    content: result(MAX_AUDIT_ROWS),
    ...(matched.length > COMPACT_ROWS / 2 ? { compact: result(COMPACT_ROWS / 2) } : {}),
  };
}

// A message waits this long for the page's record before going without it.
const PAGE_RECORD_WAIT_MS = 800;

/** The read that returns the record a page is about, keyed by the page marker's kind. */
const PAGE_READS: Record<string, (ref: string) => NetbirdApiInput> = {
  peer: (id) => ({ operation: "get_api_peers_peerId", id }),
  group: (ref) => ({ operation: "get_api_groups", query: { name: ref } }),
  network: (ref) => ({ operation: "get_api_networks", query: { name: ref } }),
  user: (ref) => ({ operation: "get_api_users", query: { name: ref } }),
};

/**
 * The record of the resource the user is looking at, read before their
 * message goes, so a question about "this peer" needs no read of its own.
 * Null when the page is about no one resource or the read is slow or fails.
 */
export async function readPageRecord(kind: string, ref: string, fetch: ManagementFetch): Promise<ToolOutcome | null> {
  const read = Object.hasOwn(PAGE_READS, kind) ? PAGE_READS[kind] : undefined;
  if (!read) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PAGE_RECORD_WAIT_MS);
  });
  try {
    // The page on screen loaded this record already, so its copy is as fresh as what the user sees.
    const outcome = await Promise.race([readNetbirdApi(read(ref), fetch, { preferCache: true }), slow]);
    return outcome?.ok ? outcome : null;
  } finally {
    clearTimeout(timer);
  }
}

/** The lists `account_search` looks through, by the kind the model names. */
export const SEARCH_KINDS: Record<string, string> = {
  peer: "get_api_peers",
  user: "get_api_users",
  group: "get_api_groups",
  policy: "get_api_policies",
  network: "get_api_networks",
  setup_key: "get_api_setup_keys",
  nameserver_group: "get_api_dns_nameservers",
};
const DEFAULT_SEARCH_KINDS = ["peer", "user", "group", "policy", "network"];
const MATCHES_PER_KIND = 5;

export interface AccountSearchInput {
  term?: unknown;
  terms?: unknown;
  kinds?: unknown;
  filters?: unknown;
}

const MAX_SEARCH_TERMS = 5;

/**
 * `account_search`: what in the account a name the user typed refers to.
 * One call looks through every list it names, from what the dashboard's pages
 * already loaded where it can, so the model learns in a single quick step that
 * "anna's laptop" is a peer, and which one, before it reads anything in full.
 */
export async function searchAccount(input: AccountSearchInput, fetch: ManagementFetch): Promise<ToolOutcome> {
  const terms = [
    ...new Set(
      [input.term, ...(Array.isArray(input.terms) ? input.terms : [])].flatMap((t) => {
        const name = text(t, 200);
        return name ? [name] : [];
      }),
    ),
  ].slice(0, MAX_SEARCH_TERMS);
  if (terms.length === 0) return { ok: false, content: JSON.stringify({ error: "Pass the name to look for as `term`, or several as `terms`." }) };
  const kinds = (Array.isArray(input.kinds) ? input.kinds : DEFAULT_SEARCH_KINDS).filter(
    (k): k is string => typeof k === "string" && Object.hasOwn(SEARCH_KINDS, k),
  );
  // Filters narrow peers only, the one list with state to filter on ("the offline one").
  const filters =
    input.filters && typeof input.filters === "object" && !Array.isArray(input.filters) ? (input.filters as Query) : {};

  // The search is local, over each kind's whole list, so with several terms the
  // same list would be fetched once per term, all in flight before the cache
  // has it: one fetch per list serves every term of this call.
  const inFlight = new Map<string, ReturnType<ManagementFetch>>();
  const fetchOnce: ManagementFetch = (path, query, options) => {
    const key = `${path}?${JSON.stringify(query)}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = fetch(path, query, options);
      inFlight.set(key, pending);
    }
    return pending;
  };
  // Each result names the term it answers, since one call may look up several.
  const results = await Promise.all(
    terms.flatMap((term) =>
      kinds.map(async (kind) => {
        const operation = SEARCH_KINDS[kind];
        const query = { ...(kind === "peer" ? filters : {}), search: term };
        const outcome = await readNetbirdApi({ operation, query }, fetchOnce, { preferCache: true });
        if (!outcome.ok) return { term, operation, ...JSON.parse(outcome.content) };
        const read = JSON.parse(outcome.content) as { data?: unknown[]; total?: number };
        const rows = Array.isArray(read.data) ? read.data : [];
        return { term, operation, matched: read.total ?? rows.length, data: rows.slice(0, MATCHES_PER_KIND) };
      }),
    ),
  );
  const found = results.filter((r) => r.matched > 0 || r.status !== undefined);
  const unmatched = terms.filter((term) => !found.some((r) => r.term === term));
  return {
    ok: true,
    content: JSON.stringify({
      term: terms.join(", "),
      ...(unmatched.length > 0 ? { note: `Nothing in the account matches: ${unmatched.join(", ")}.` } : {}),
      results: found,
    }),
  };
}

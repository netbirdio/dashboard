// The agent never reads the management API itself: the dashboard reads it here,
// keeps only the fields the operation's profile lists, and the result is tokenised before it leaves the tab.
import { BROWSER_RESULT_MAX_CHARS, type ToolOutcome } from "./contract";
import { fuzzyScore, fuzzySearch } from "./fuzzy";
import { allowlist, PROFILES } from "./profiles";

export type ManagementResponse =
  | { ok: true; body: unknown }
  | { ok: false; status: number; statusText: string };

export type ManagementFetch = (
  path: string,
  query: Record<string, string>,
  options?: { preferCache?: boolean },
) => Promise<ManagementResponse>;

const MAX_ROWS = 1_000;
// Leaves room for tokenising, which can lengthen a row.
const LIST_CHARS = Math.floor(BROWSER_RESULT_MAX_CHARS * 0.75);
const MAX_COUNTS = 100;
// `|` for a user id from an identity provider (`google-oauth2|1133…`).
const ID = /^[A-Za-z0-9_|-]{1,128}$/;

type Value = string | number | boolean;
type Query = Record<string, Value>;
type Row = Record<string, unknown>;

const asBool = (v: Value) => v === true || v === "true" || v === 1 || v === "1";
const has = (field: unknown, wanted: string) =>
  typeof field === "string" && field.toLowerCase().includes(wanted.toLowerCase());
const same = (field: unknown, wanted: string) =>
  typeof field === "string" && field.toLowerCase() === wanted.toLowerCase();
const named = (row: Row, v: Value) => same(row.id, String(v)) || same(row.name, String(v));

const LOCAL_FILTERS: Record<string, Record<string, (row: Row, value: Value) => boolean>> = {
  get_api_peers: {
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
  get_api_users: { email: (row, v) => same(row.email, String(v)), name: named, role: (row, v) => same(row.role, String(v)) },
  get_api_reverse_proxies_services: {
    name: named,
    domain: (row, v) => same(row.domain, String(v)),
    status: (row, v) => same((row.meta as Row | undefined)?.status, String(v)),
    enabled: (row, v) => row.enabled === asBool(v),
    cluster: (row, v) => same(row.proxy_cluster, String(v)),
  },
  get_api_reverse_proxies_clusters: { online: (row, v) => row.online === asBool(v) },
};

// The only query keys forwarded to the management API. A key such as `account`
// would otherwise, for an MSP parent, read another tenant.
const PAGED = ["page", "page_size"];
const REMOTE_QUERY: Record<string, readonly string[]> = {
  get_api_peers: [...PAGED, "ip"],
  get_api_users: [...PAGED, "service_user"],
  get_api_events_network_traffic: [...PAGED, "start_date", "end_date", "destination_id", "source_id", "protocol"],
  get_api_events_proxy: [...PAGED, "start_date", "end_date", "host", "status", "status_code", "source_ip", "user_email", "user_name"],
};

function splitQuery(operation: string, query: Query = {}) {
  const local = LOCAL_FILTERS[operation] ?? {};
  const allowed = REMOTE_QUERY[operation] ?? PAGED;
  const remote: Record<string, string> = {};
  const filters: [(row: Row, value: Value) => boolean, Value][] = [];
  let search: string | undefined;
  let fields: string[] | undefined;
  let countBy: string | undefined;
  for (const [key, value] of Object.entries(query)) {
    if (key === "search") search = String(value);
    else if (key === "count_by") countBy = String(value).trim();
    else if (key === "fields") fields = String(value).split(",").map((f) => f.trim()).filter(Boolean);
    else if (Object.hasOwn(local, key)) filters.push([local[key], value]);
    else if (allowed.includes(key)) remote[key] = String(value);
  }
  return { remote, filters, search, fields, countBy };
}

// Each count is shaped like a row, `{os: "macOS", count: 12}`, so the field is tokenised as it would be in the row.
function countedBy(operation: string, rows: Row[], field: string): string {
  const buckets = new Map<string, { value: unknown; count: number }>();
  let missing = 0;
  for (const row of rows) {
    const raw = row[field];
    if (raw === undefined || raw === null || raw === "") {
      missing++;
      continue;
    }
    for (const item of Array.isArray(raw) ? raw : [raw]) {
      const key = item && typeof item === "object" ? String((item as Row).id ?? JSON.stringify(item)) : JSON.stringify(item);
      const bucket = buckets.get(key) ?? { value: Array.isArray(raw) ? [item] : item, count: 0 };
      bucket.count++;
      buckets.set(key, bucket);
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const other = sorted.slice(MAX_COUNTS).reduce((sum, b) => sum + b.count, 0);
  return JSON.stringify({
    operation,
    total: rows.length,
    count_by: field,
    distinct: sorted.length,
    ...(missing > 0 ? { missing } : {}),
    ...(other > 0 ? { other, note: `Only the ${MAX_COUNTS} most common values are listed; \`other\` sums the rest.` } : {}),
    counts: sorted.slice(0, MAX_COUNTS).map(({ value, count }) => ({ [field]: value, count })),
  });
}

function picked(rows: Row[], fields: string[] | undefined): Row[] {
  if (!fields?.length) return rows;
  const keep = new Set(["id", "name", ...fields]);
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => keep.has(key))));
}

const failed = (operation: string, body: Record<string, unknown>): ToolOutcome => ({
  ok: false,
  content: JSON.stringify({ operation, ...body }),
});

const listResult = (operation: string, rows: unknown[], total: number, cap: number, note?: string) =>
  JSON.stringify({
    operation,
    total,
    ...(total > cap ? { shown: cap } : {}),
    ...(note ? { note } : {}),
    data: rows.slice(0, cap),
  });

const CUT_NOTE = "Cut to fit. To see the rest, read again with a filter or `fields`; the user cannot narrow it.";

function fittedList(operation: string, rows: Row[], note?: string): string {
  const at = (cap: number) => listResult(operation, rows, rows.length, cap, cap < rows.length ? CUT_NOTE : note);
  let low = 0;
  let high = Math.min(rows.length, MAX_ROWS);
  if (at(high).length <= LIST_CHARS) return at(high);
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (at(mid).length <= LIST_CHARS) low = mid;
    else high = mid - 1;
  }
  return at(low);
}

export interface NetbirdApiInput {
  operation?: unknown;
  id?: unknown;
  query?: unknown;
}

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
  const path = op.path.replace("{id}", encodeURIComponent(id ?? ""));
  const query = input.query && typeof input.query === "object" && !Array.isArray(input.query) ? (input.query as Query) : {};
  const { remote, filters, search, fields, countBy } = splitQuery(operation, query);

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
  if (countBy !== undefined) {
    if (countBy === "id" || countBy === "name" || !Object.hasOwn(op.profile.fields, countBy)) {
      return failed(operation, { error: `Cannot count by \`${countBy}\`: name one of this list's fields.` });
    }
    return { ok: true, content: countedBy(operation, rows, countBy) };
  }
  rows = picked(rows, fields);
  const note = search && rows.length === 0 ? "Nothing matched the search; try fewer or different words." : undefined;
  return { ok: true, content: fittedList(operation, rows, note) };
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const MAX_AUDIT_ROWS = 50;
const AUDIT_MATCH = 50;

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
  id: string;
  timestamp: string;
  activity: string;
  activity_code: string;
  initiator_name?: string;
  initiator_email?: string;
  target?: string;
  peer?: string;
  user?: string;
  group?: string;
  old_name?: string;
  new_name?: string;
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
  return { ok: true, content: result(MAX_AUDIT_ROWS) };
}

const PAGE_RECORD_WAIT_MS = 800;

const PAGE_READS: Record<string, (ref: string) => NetbirdApiInput> = {
  peer: (id) => ({ operation: "get_api_peers_peerId", id }),
  group: (ref) => ({ operation: "get_api_groups", query: { name: ref } }),
  network: (ref) => ({ operation: "get_api_networks", query: { name: ref } }),
  user: (ref) => ({ operation: "get_api_users", query: { name: ref } }),
};

export async function readPageRecord(kind: string, ref: string, fetch: ManagementFetch): Promise<ToolOutcome | null> {
  const read = Object.hasOwn(PAGE_READS, kind) ? PAGE_READS[kind] : undefined;
  if (!read) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PAGE_RECORD_WAIT_MS);
  });
  try {
    const outcome = await Promise.race([readNetbirdApi(read(ref), fetch, { preferCache: true }), slow]);
    return outcome?.ok ? outcome : null;
  } finally {
    clearTimeout(timer);
  }
}

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
  const filters =
    input.filters && typeof input.filters === "object" && !Array.isArray(input.filters) ? (input.filters as Query) : {};

  // With several terms the same list would be fetched once per term, all in flight before the cache has it.
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

import { describe, expect, test } from "vitest";
import { BROWSER_RESULT_MAX_CHARS } from "./contract";
import { fuzzyScore } from "./fuzzy";
import { type ManagementFetch, readAuditEvents, readNetbirdApi, readPageRecord, searchAccount } from "./reads";
import { redactResult, Vault } from "./vault";

const peer = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  hostname: name,
  connected: true,
  groups: [{ id: "g-all", name: "All" }],
  ...extra,
});

const PEERS = [
  peer("p1", "laptop-anna"),
  peer("p2", "staging-db", { connected: false, groups: [{ id: "g-srv", name: "Servers" }] }),
  peer("p3", "web-server", { groups: [{ id: "g-srv", name: "Servers" }] }),
];

// A real account's peers sit in many groups, which makes each row wide.
const GROUPS = Array.from({ length: 30 }, (_, i) => ({ id: `g-${i}`, name: `Department group number ${i}` }));

function fakeFetch(bodies: Record<string, unknown>): ManagementFetch & { calls: [string, Record<string, string>][] } {
  const calls: [string, Record<string, string>][] = [];
  const fetch = async (path: string, query: Record<string, string>) => {
    calls.push([path, query]);
    return Object.hasOwn(bodies, path)
      ? { ok: true as const, body: bodies[path] }
      : { ok: false as const, status: 404, statusText: "Not Found" };
  };
  return Object.assign(fetch, { calls });
}

const data = async (outcome: Promise<{ content: string }>) => JSON.parse((await outcome).content).data;

describe("fuzzy", () => {
  test("forgives word order, separators and a typo", () => {
    expect(fuzzyScore("anna laptop", "laptop-anna")).toBeGreaterThan(0);
    expect(fuzzyScore("stagng-db", "staging-db")).toBeGreaterThan(0);
    expect(fuzzyScore("stagingdb", "staging-db")).toBeGreaterThan(0);
    expect(fuzzyScore("payroll", "laptop-anna")).toBe(0);
  });

  test("ranks an exact match above a loose one", () => {
    expect(fuzzyScore("web", "web")).toBeGreaterThan(fuzzyScore("web", "web-server"));
    expect(fuzzyScore("web", "web-server")).toBeGreaterThan(fuzzyScore("wbe", "web-server"));
  });
});

describe("netbird_api", () => {
  test("searches loosely, best match first", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const rows = await data(readNetbirdApi({ operation: "get_api_peers", query: { search: "stagng db" } }, fetch));
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["p2"]);
    // `search` is the dashboard's, never sent to management.
    expect(fetch.calls[0]).toEqual(["/api/peers", {}]);
  });

  test("filters locally and passes the rest to management", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const rows = await data(
      readNetbirdApi({ operation: "get_api_peers", query: { group: "Servers", connected: "true", ip: "100.64.0.1" } }, fetch),
    );
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["p3"]);
    expect(fetch.calls[0]).toEqual(["/api/peers", { ip: "100.64.0.1" }]);
  });

  test("a peer's name filter matches its name or its id", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    expect(await data(readNetbirdApi({ operation: "get_api_peers", query: { name: "p1" } }, fetch))).toHaveLength(1);
    expect(await data(readNetbirdApi({ operation: "get_api_peers", query: { name: "LAPTOP-ANNA" } }, fetch))).toHaveLength(1);
  });

  test("refuses an operation without a profile, and an id it needs", async () => {
    const fetch = fakeFetch({});
    expect((await readNetbirdApi({ operation: "delete_api_peers" }, fetch)).ok).toBe(false);
    expect((await readNetbirdApi({ operation: "get_api_peers_peerId" }, fetch)).ok).toBe(false);
    expect((await readNetbirdApi({ operation: "get_api_peers_peerId", id: "../users" }, fetch)).ok).toBe(false);
    expect(fetch.calls).toHaveLength(0);
  });

  test("a long list is cut at a thousand rows", async () => {
    const many = Array.from({ length: 1_200 }, (_, i) => peer(`p${i}`, `host-${i}`));
    const outcome = await readNetbirdApi({ operation: "get_api_peers" }, fakeFetch({ "/api/peers": many }));
    const full = JSON.parse(outcome.content);
    expect(full.total).toBe(1_200);
    expect(full.shown).toBe(1_000);
    expect(full.data).toHaveLength(1_000);
    expect(full.note).toMatch(/the user cannot narrow it/);
  });

  test("`fields` keeps only the columns asked for, with id and name", async () => {
    const outcome = await readNetbirdApi(
      { operation: "get_api_peers", query: { fields: "connected, os", login_expired: false } },
      fakeFetch({ "/api/peers": [peer("p1", "laptop-anna", { os: "macOS", login_expired: false, version: "0.60.2" })] }),
    );
    expect(JSON.parse(outcome.content).data).toEqual([{ id: "p1", name: "laptop-anna", connected: true, os: "macOS" }]);
  });

  test("`fields` fits many more rows than a list too long to send whole", async () => {
    const many = Array.from({ length: 5_000 }, (_, i) =>
      peer(`p${i}`, `workstation-${i}.office.example.com`, { os: "Windows 11 Enterprise 24H2", version: "0.60.2", dns_label: `host-${i}.netbird.cloud`, groups: GROUPS }),
    );
    const shown = async (query?: Record<string, string>) => {
      const outcome = await readNetbirdApi({ operation: "get_api_peers", query }, fakeFetch({ "/api/peers": many }));
      return JSON.parse(outcome.content).data.length as number;
    };
    expect(await shown()).toBeLessThan(1_000);
    expect(await shown({ fields: "connected" })).toBe(1_000);
  });

  test("wide rows go whole while they fit, every column of every row", async () => {
    const wide = Array.from({ length: 100 }, (_, i) =>
      peer(`p${i}`, `workstation-${i}.office.example.com`, { groups: GROUPS, os: "Windows 11 Enterprise 24H2", login_expired: true }),
    );
    const outcome = await readNetbirdApi({ operation: "get_api_peers", query: { login_expired: true } }, fakeFetch({ "/api/peers": wide }));
    // What the old 128k cap cut.
    expect(outcome.content.length).toBeGreaterThan(128_000);
    const read = JSON.parse(outcome.content);
    expect(read.shown).toBeUndefined();
    expect(read.data).toHaveLength(100);
    expect(read.data[0].groups).toHaveLength(GROUPS.length);
  });

  test("a list that does not fit keeps as many rows as do", async () => {
    const many = Array.from({ length: 3_000 }, (_, i) =>
      peer(`p${i}`, `workstation-${i}-with-a-long-name.office.example.com`, { os: "Windows 11 Enterprise 24H2", groups: GROUPS }),
    );
    const { content } = await readNetbirdApi({ operation: "get_api_peers" }, fakeFetch({ "/api/peers": many }));
    const shown = JSON.parse(content).shown as number;
    expect(content.length).toBeLessThanOrEqual(BROWSER_RESULT_MAX_CHARS * 0.75);
    expect(shown).toBeLessThan(1_000);
    // One more row would not have fit.
    expect(content.length + content.length / shown).toBeGreaterThan(BROWSER_RESULT_MAX_CHARS * 0.75);
    expect(JSON.parse(content).note).toMatch(/^Cut to fit\. .* the user cannot narrow it\.$/);
  });

  test("`count_by` counts every matching row by one field, most common first, without the rows", async () => {
    const peers = [
      peer("p1", "a", { os: "macOS" }),
      peer("p2", "b", { os: "Windows", connected: false }),
      peer("p3", "c", { os: "Windows" }),
      peer("p4", "d", { os: "" }),
    ];
    const outcome = await readNetbirdApi({ operation: "get_api_peers", query: { count_by: "os" } }, fakeFetch({ "/api/peers": peers }));
    expect(JSON.parse(outcome.content)).toEqual({
      operation: "get_api_peers",
      total: 4,
      count_by: "os",
      distinct: 2,
      missing: 1,
      counts: [{ os: "Windows", count: 2 }, { os: "macOS", count: 1 }],
    });
    const offline = await readNetbirdApi(
      { operation: "get_api_peers", query: { count_by: "os", connected: false } },
      fakeFetch({ "/api/peers": peers }),
    );
    expect(JSON.parse(offline.content).counts).toEqual([{ os: "Windows", count: 1 }]);
  });

  test("`count_by` a list field counts each item, and an unknown field is refused", async () => {
    const outcome = await readNetbirdApi({ operation: "get_api_peers", query: { count_by: "groups" } }, fakeFetch({ "/api/peers": PEERS }));
    expect(JSON.parse(outcome.content).counts).toEqual([
      { groups: [{ id: "g-srv", name: "Servers" }], count: 2 },
      { groups: [{ id: "g-all", name: "All" }], count: 1 },
    ]);
    const refused = await readNetbirdApi({ operation: "get_api_peers", query: { count_by: "secret" } }, fakeFetch({ "/api/peers": PEERS }));
    expect(refused.ok).toBe(false);
  });

  test("a counted field is tokenised as it would be in a row", async () => {
    const outcome = await readNetbirdApi(
      { operation: "get_api_peers", query: { count_by: "connection_ip" } },
      fakeFetch({ "/api/peers": [peer("p1", "a", { connection_ip: "203.0.113.7" })] }),
    );
    const sent = redactResult(new Vault(), "netbird_api", outcome.content);
    expect(sent).not.toContain("203.0.113.7");
    expect(JSON.parse(sent).counts).toEqual([{ connection_ip: expect.stringMatching(/^\[IP_[a-z2-7]+\]$/), count: 1 }]);
  });

  test("users filter by role locally, and by service_user on the server", async () => {
    const users = [
      { id: "u1", name: "Anna", email: "anna@acme.test", role: "admin", is_service_user: false },
      { id: "u2", name: "Bob", email: "bob@acme.test", role: "user", is_service_user: false },
    ];
    const fetch = fakeFetch({ "/api/users": users });
    expect((await data(readNetbirdApi({ operation: "get_api_users", query: { role: "Admin" } }, fetch))).map((u: { id: string }) => u.id)).toEqual(["u1"]);
    await readNetbirdApi({ operation: "get_api_users", query: { service_user: true } }, fetch);
    expect(fetch.calls.at(-1)).toEqual(["/api/users", { service_user: "true" }]);
  });

  test("a filtered read reads only the rows that match", async () => {
    const outcome = await readNetbirdApi(
      { operation: "get_api_peers", query: { login_expired: true } },
      fakeFetch({ "/api/peers": [...PEERS, peer("p4", "old-laptop", { login_expired: true })] }),
    );
    expect(JSON.parse(outcome.content).data.map((p: { id: string }) => p.id)).toEqual(["p4"]);
  });

  test("a failed read carries its status only", async () => {
    const outcome = await readNetbirdApi({ operation: "get_api_groups" }, fakeFetch({}));
    expect(outcome).toEqual({
      ok: false,
      content: JSON.stringify({ operation: "get_api_groups", status: 404, statusText: "Not Found" }),
    });
  });
});

describe("audit_events", () => {
  const now = new Date().toISOString();
  const EVENTS = [
    { id: 3, timestamp: now, activity: "Peer renamed", activity_code: "peer.rename", initiator_name: "Bob", meta: { name: "staging-db" } },
    { id: 2, timestamp: now, activity: "Signed in", activity_code: "dashboard.login", initiator_name: "Bob" },
    { id: 1, timestamp: "2020-01-01T00:00:00Z", activity: "Group created", activity_code: "group.add", meta: { name: "Old" } },
  ];

  test("drops noise and old rows, and matches a target loosely", async () => {
    const fetch = fakeFetch({ "/api/events/audit": EVENTS });
    const all = JSON.parse((await readAuditEvents({}, fetch)).content);
    expect(all.rows.map((r: { id: string }) => r.id)).toEqual(["3"]);
    const typo = JSON.parse((await readAuditEvents({ target: "stagin db" }, fetch)).content);
    expect(typo.rows).toHaveLength(1);
    const logins = JSON.parse((await readAuditEvents({ activity: "login" }, fetch)).content);
    expect(logins.rows.map((r: { id: string }) => r.id)).toEqual(["2"]);
  });
});

describe("page record", () => {
  test("reads the record a peer page is about", async () => {
    const fetch = fakeFetch({ "/api/peers/p2": PEERS[1] });
    const outcome = await readPageRecord("peer", "p2", fetch);
    expect(JSON.parse(outcome!.content).data.id).toBe("p2");
  });

  test("finds a group by its id or name", async () => {
    const fetch = fakeFetch({ "/api/groups": [{ id: "g-srv", name: "Servers" }, { id: "g-all", name: "All" }] });
    expect(JSON.parse((await readPageRecord("group", "g-srv", fetch))!.content).data).toHaveLength(1);
  });

  test("a page about no one resource reads nothing", async () => {
    const fetch = fakeFetch({});
    expect(await readPageRecord("settings", "x", fetch)).toBeNull();
    expect(fetch.calls).toHaveLength(0);
  });
});

describe("account_search", () => {
  const USERS = [{ id: "u1", name: "Anna Admin", email: "anna@acme.test", role: "owner" }];

  test("finds a typed name across lists, from the page cache", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS, "/api/users": USERS, "/api/groups": [], "/api/policies": [], "/api/networks": [] });
    const preferred: unknown[] = [];
    const tracking: ManagementFetch = (path, query, options) => {
      preferred.push(options?.preferCache);
      return fetch(path, query);
    };
    const result = JSON.parse((await searchAccount({ term: "anna" }, tracking)).content);
    expect(result.results.map((r: { operation: string }) => r.operation)).toEqual(["get_api_peers", "get_api_users"]);
    expect(result.results[0].data[0].id).toBe("p1");
    expect(preferred.every(Boolean)).toBe(true);
  });

  test("filters narrow the peers only", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const result = JSON.parse(
      (await searchAccount({ term: "web", kinds: ["peer"], filters: { connected: false } }, fetch)).content,
    );
    expect(result.note).toBe("Nothing in the account matches: web.");
  });

  test("leaves the browser with the name a token the model can use from then on", async () => {
    const vault = new Vault();
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const outcome = await searchAccount({ term: "laptop-anna", kinds: ["peer"] }, fetch);
    const sent = JSON.parse(redactResult(vault, "account_search", outcome.content));
    expect(JSON.stringify(sent)).not.toContain("laptop-anna");
    expect(sent.term).toBe(sent.results[0].data[0].name);
    expect(sent.results[0].data[0].id).toBe("p1");
  });
});

describe("remote query keys", () => {
  test("only the keys an operation accepts reach the management API; `account` never does", async () => {
    const calls: [string, Record<string, string>][] = [];
    const fetch: ManagementFetch = async (path, query) => {
      calls.push([path, query]);
      return { ok: true, status: 200, statusText: "OK", body: [] };
    };
    await readNetbirdApi({ operation: "get_api_users", query: { account: "other-tenant", page: "2" } }, fetch);
    await readNetbirdApi({ operation: "get_api_events_proxy", query: { host: "app.example", account: "other-tenant", foo: "bar" } }, fetch);
    expect(calls.map(([, q]) => q)).toEqual([{ page: "2" }, { host: "app.example" }]);
  });
});

describe("proxy access log", () => {
  test("a request path reaches the model without its query string or fragment", async () => {
    const fetch = fakeFetch({
      "/api/events/proxy": {
        page: 1,
        page_size: 50,
        total_records: 2,
        total_pages: 1,
        data: [
          { id: "e1", path: "/reset?token=Zq8sYv&next=%2F", status_code: 302 },
          { id: "e2", path: "/oauth/callback#code=a1b2", status_code: 200 },
        ],
      },
    });
    const page = await data(readNetbirdApi({ operation: "get_api_events_proxy" }, fetch));
    expect(page.data.map((e: { path: string }) => e.path)).toEqual(["/reset", "/oauth/callback"]);
  });
});

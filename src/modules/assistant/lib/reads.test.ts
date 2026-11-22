import { describe, expect, test } from "vitest";
import { BROWSER_RESULT_MAX_CHARS } from "./contract";
import { fuzzyScore } from "./fuzzy";
import { type ManagementFetch, readAuditEvents, readNetbirdApi, readPageRecord, searchAccount } from "./reads";
import { redactResult, restoreToolInput, Vault } from "./vault";

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
    const preferred: unknown[] = [];
    const tracking: ManagementFetch = (path, query, options) => {
      preferred.push(options?.preferCache);
      return fetch(path, query);
    };
    const outcome = await readPageRecord("peer", "p2", tracking);
    expect(JSON.parse(outcome!.content).data.id).toBe("p2");
    expect(preferred).toEqual([true]);
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

  test("finds a typed name across lists, from the network", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS, "/api/users": USERS, "/api/groups": [], "/api/policies": [], "/api/networks": [] });
    const preferred: unknown[] = [];
    const tracking: ManagementFetch = (path, query, options) => {
      preferred.push(options?.preferCache);
      return fetch(path, query);
    };
    const result = JSON.parse((await searchAccount({ term: "anna" }, tracking)).content);
    expect(result.results.map((r: { operation: string }) => r.operation)).toEqual(["get_api_peers", "get_api_users"]);
    expect(result.results[0].data[0].id).toBe("p1");
    expect(preferred.length).toBeGreaterThan(0);
    expect(preferred.some(Boolean)).toBe(false);
  });

  test("a filter that leaves no peer is not reported as nothing in the account", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const result = JSON.parse(
      (await searchAccount({ term: "web", kinds: ["peer"], filters: { connected: false } }, fetch)).content,
    );
    expect(result.results).toEqual([]);
    expect(result.unmatched).toEqual(["web"]);
    expect(result.note).not.toContain("Nothing in");
    expect(result.note).toContain("`filters`");
    const unfiltered = JSON.parse((await searchAccount({ term: "payroll", kinds: ["peer"] }, fetch)).content);
    expect(unfiltered.unmatched).toEqual(["payroll"]);
    expect(unfiltered.note).toContain("Nothing in the searched lists matches");
  });

  test("a read that threw is an error, not a name that does not exist", async () => {
    const offline: ManagementFetch = async () => {
      throw new Error("offline");
    };
    const outcome = await searchAccount({ term: "alice" }, offline);
    const result = JSON.parse(outcome.content);
    expect(outcome.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.note).toBeUndefined();
    expect(result.unmatched).toBeUndefined();
    expect(result.results).toHaveLength(5);
    expect(result.results.every((r: { error?: string }) => r.error)).toBe(true);
    const sent = JSON.parse(redactResult(new Vault(), "account_search", outcome.content));
    expect(sent.error).toBe(result.error);
    expect(sent.results[0]).toMatchObject({ term: "alice", operation: "get_api_peers", error: result.results[0].error });
  });

  test("one list failing shows beside what the others matched", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const partial: ManagementFetch = (path, query) => {
      if (path === "/api/users") throw new Error("offline");
      return fetch(path, query);
    };
    const outcome = await searchAccount({ terms: ["anna", "payroll"], kinds: ["peer", "user"] }, partial);
    const result = JSON.parse(outcome.content);
    expect(outcome.ok).toBe(true);
    expect(result.results.map((r: { term: string; operation: string }) => [r.term, r.operation])).toEqual([
      ["anna", "get_api_peers"],
      ["anna", "get_api_users"],
      ["payroll", "get_api_users"],
    ]);
    expect(result.results[1].error).toBeTruthy();
    expect(result.unmatched).toBeUndefined();
  });

  test("kinds it does not know are an error, or named when some remain", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const none = await searchAccount({ term: "anna", kinds: ["peers"] }, fetch);
    expect(none.ok).toBe(false);
    expect(JSON.parse(none.content).error).toContain("peer, user, group");
    expect(fetch.calls).toHaveLength(0);
    const some = JSON.parse((await searchAccount({ term: "anna", kinds: ["peer", "devices"] }, fetch)).content);
    expect(some.results).toHaveLength(1);
    expect(some.note).toContain("`kinds`");
  });

  test("a filter the peer list does not take is named, not silently dropped", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const result = JSON.parse(
      (await searchAccount({ term: "anna", kinds: ["peer"], filters: { user_id: "u1" } }, fetch)).content,
    );
    expect(result.results).toHaveLength(1);
    expect(result.note).toContain("user_id");
  });

  test("redaction keeps how many matched and which term each block answers", async () => {
    const many = Array.from({ length: 40 }, (_, i) => peer(`p${i}`, `prod-${i}`));
    const fetch = fakeFetch({ "/api/peers": many });
    const outcome = await searchAccount({ terms: ["prod", "prod-3"], kinds: ["peer"] }, fetch);
    const vault = new Vault();
    const sent = JSON.parse(redactResult(vault, "account_search", outcome.content));
    expect(sent.results[0].matched).toBe(40);
    expect(sent.results[0].data).toHaveLength(5);
    expect(sent.results[1].matched).toBe(JSON.parse(outcome.content).results[1].matched);
    expect(sent.results[1].matched).toBeGreaterThan(5);
    expect(sent.results[1].data[0].id).toBe("p3");
    expect(sent.results[0].term).toBe("prod");
    expect(vault.restoreString(sent.results[1].term, "display")).toBe("prod-3");
    expect(sent.results[1].term).toMatch(/^\[PEER_/);
  });

  test("a name or email that matched nothing does not leave the browser in the note", async () => {
    const vault = new Vault();
    const email = vault.scrub("jane.doe@corp.example");
    const name = vault.mint("user", "Jane Doe");
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const input = restoreToolInput(vault, "account_search", { terms: [email, name], kinds: ["peer"] });
    const outcome = await searchAccount(input as { terms: string[] }, fetch);
    expect(outcome.content).toContain("Jane Doe");
    const sent = redactResult(vault, "account_search", outcome.content);
    expect(sent).not.toContain("jane.doe");
    expect(sent).not.toContain("Jane");
    expect(JSON.parse(sent).unmatched).toEqual([email, name]);
  });

  test("a name match is shown before rows that only mention the word elsewhere", async () => {
    const inGroup = Array.from({ length: 8 }, (_, i) => peer(`g${i}`, `laptop-${i}`, { groups: [{ id: "g-prod", name: "prod" }] }));
    const fetch = fakeFetch({ "/api/peers": [...inGroup, peer("p-db", "prod-db")] });
    const result = JSON.parse((await searchAccount({ term: "prod", kinds: ["peer"] }, fetch)).content);
    expect(result.results[0].matched).toBe(9);
    expect(result.results[0].data[0].id).toBe("p-db");
  });

  test("a name a typo away does not come before an exact match in another field", async () => {
    const typos = ["prdo", "pord", "rpod", "prdo", "pord", "rpod"].map((name, i) => peer(`t${i}`, name));
    const exact = peer("in-group", "laptop-7", { groups: [{ id: "g-prod", name: "prod" }] });
    const fetch = fakeFetch({ "/api/peers": [...typos, exact] });
    const rows = await data(readNetbirdApi({ operation: "get_api_peers", query: { search: "prod" } }, fetch));
    expect(rows[0].id).toBe("in-group");
    const result = JSON.parse((await searchAccount({ term: "prod", kinds: ["peer"] }, fetch)).content);
    expect(result.results[0].data.map((r: { id: string }) => r.id)).toContain("in-group");
  });

  test("a search of 120,000 characters is cut to the 200 a term may have", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const search = `staging-db${" ".repeat(200)}${"ab cd ".repeat(20_000)}`;
    const rows = await data(readNetbirdApi({ operation: "get_api_peers", query: { search } }, fetch));
    expect(rows.map((r: { id: string }) => r.id)).toEqual(["p2"]);
  });

  test("`filters` that would shape the list instead of narrowing it are dropped and named", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const search = async (filters: Record<string, unknown>) =>
      JSON.parse((await searchAccount({ term: "anna", kinds: ["peer"], filters }, fetch)).content);
    const counted = await search({ count_by: "os" });
    expect(counted.results[0].matched).toBe(1);
    expect(counted.results[0].data[0]).toMatchObject({ id: "p1", name: "laptop-anna" });
    expect(counted.note).toContain("`count_by`");
    const invalid = await search({ count_by: "secret" });
    expect(invalid.error).toBeUndefined();
    expect(invalid.results[0].data).toHaveLength(1);
    const overwritten = await search({ search: "web", fields: "os", connected: true });
    expect(overwritten.results[0].data[0]).toMatchObject({ id: "p1", hostname: "laptop-anna" });
    expect(overwritten.note).toContain("`search`, `fields`");
    expect(overwritten.note).not.toContain("connected");
    const users = JSON.parse((await searchAccount({ term: "anna", kinds: ["user"], filters: { count_by: "os" } }, fakeFetch({ "/api/users": USERS }))).content);
    expect(users.note).toContain("narrow peers only");
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
    expect(calls.map(([, q]) => q)).toEqual([{ page: "2" }, { host: "app.example", page_size: "100" }]);
  });
});

describe("query keys a read cannot use", () => {
  test("an unknown key is named in the note instead of passing as a filter", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const result = JSON.parse((await readNetbirdApi({ operation: "get_api_peers", query: { user_id: "u1", connected: true } }, fetch)).content);
    expect(result.total).toBe(2);
    expect(result.note).toContain("user_id");
    expect(result.note).not.toContain("connected");
    const clean = JSON.parse((await readNetbirdApi({ operation: "get_api_peers", query: { connected: true } }, fetch)).content);
    expect(clean.note).toBeUndefined();
  });

  test("the note survives beside the search and count notes, and through redaction", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    const searched = await readNetbirdApi({ operation: "get_api_peers", query: { search: "zzzz", user_id: "u1" } }, fetch);
    const note = JSON.parse(searched.content).note as string;
    expect(note).toContain("user_id");
    expect(note).toContain("Nothing matched the search");
    expect(JSON.parse(redactResult(new Vault(), "netbird_api", searched.content)).note).toBe(note);
    const counted = JSON.parse((await readNetbirdApi({ operation: "get_api_peers", query: { count_by: "connected", user_id: "u1" } }, fetch)).content);
    expect(counted.note).toContain("user_id");
  });

  test("search, fields and count_by on a result that is not a list are named as unused", async () => {
    const fetch = fakeFetch({
      "/api/events/network-traffic": { page: 1, page_size: 50, total_records: 1, total_pages: 1, data: [{ flow_id: "f1", protocol: 6 }] },
    });
    const outcome = await readNetbirdApi(
      { operation: "get_api_events_network_traffic", query: { search: "zzz", count_by: "protocol", fields: "protocol", page: 1 } },
      fetch,
    );
    const result = JSON.parse(outcome.content);
    expect(result.data.data).toHaveLength(1);
    for (const key of ["search", "count_by", "fields"]) expect(result.note).toContain(key);
    expect(result.note.split(". ")[0]).not.toContain("page");
    expect(fetch.calls[0][1]).toEqual({ page: "1", page_size: "100" });
  });
});

describe("a paged read", () => {
  const page = { page: 1, page_size: 100, total_records: 5_000, total_pages: 50, data: [{ flow_id: "f1", protocol: 6 }] };

  test("asks for a page small enough to send when the model names no size, and says so", async () => {
    const fetch = fakeFetch({ "/api/events/network-traffic": page, "/api/events/proxy": page, "/api/agent-network/access-logs": page });
    for (const operation of ["get_api_events_network_traffic", "get_api_events_proxy", "get_api_agent_network_access_logs"]) {
      const result = JSON.parse((await readNetbirdApi({ operation }, fetch)).content);
      expect(result.note).toContain("`page_size`");
    }
    expect(fetch.calls.map(([, query]) => query)).toEqual([{ page_size: "100" }, { page_size: "100" }, { page_size: "100" }]);
  });

  test("keeps the size the model asked for", async () => {
    const fetch = fakeFetch({ "/api/events/network-traffic": page });
    const result = JSON.parse(
      (await readNetbirdApi({ operation: "get_api_events_network_traffic", query: { page: 2, page_size: 500 } }, fetch)).content,
    );
    expect(fetch.calls[0][1]).toEqual({ page: "2", page_size: "500" });
    expect(result.note).toBeUndefined();
  });

  test("a list is not given a page size", async () => {
    const fetch = fakeFetch({ "/api/peers": PEERS });
    await readNetbirdApi({ operation: "get_api_peers" }, fetch);
    expect(fetch.calls[0][1]).toEqual({});
  });
});

describe("what the model passed, given back", () => {
  const USERS = [
    { id: "u1", name: "Li", email: "li@acme.test", role: "admin" },
    { id: "u2", name: "İbrahim Kaya", email: "ik@acme.test", role: "user" },
  ];

  const namesRead = async (vault: Vault) => {
    const outcome = await readNetbirdApi({ operation: "get_api_users" }, fakeFetch({ "/api/users": USERS }));
    const sent = JSON.parse(redactResult(vault, "netbird_api", outcome.content));
    return sent.data.map((u: { name: string }) => u.name) as [string, string];
  };

  test("a search never sends a short or a dotted-capital name back as itself", async () => {
    const vault = new Vault();
    const [li, ibrahim] = await namesRead(vault);
    const input = restoreToolInput(vault, "account_search", { terms: [li, ibrahim], kinds: ["peer"] });
    const outcome = await searchAccount(input as { terms: string[] }, fakeFetch({ "/api/peers": [peer("p1", "Li")] }));
    expect(outcome.content).toContain("İbrahim Kaya");
    const sent = redactResult(vault, "account_search", outcome.content);
    expect(sent).not.toContain("İbrahim");
    expect(sent).not.toContain('"Li');
    const result = JSON.parse(sent);
    expect(result.term).toBe(`${li}, ${ibrahim}`);
    expect(result.unmatched).toEqual([ibrahim]);
    expect(result.results[0].term).toBe(li);
    expect(result.terms).toBeUndefined();
  });

  test("a search that could read nothing does not either", async () => {
    const vault = new Vault();
    const [li, ibrahim] = await namesRead(vault);
    const input = restoreToolInput(vault, "account_search", { terms: [li, ibrahim], kinds: ["peer"] });
    const sent = redactResult(vault, "account_search", (await searchAccount(input as { terms: string[] }, fakeFetch({}))).content);
    expect(sent).not.toContain("İbrahim");
    expect(JSON.parse(sent).term).toBe(`${li}, ${ibrahim}`);
    expect(JSON.parse(sent).results.map((r: { term: string }) => r.term)).toEqual([li, ibrahim]);
  });

  test("a field to count by or an operation that holds a name is not sent back at all", async () => {
    const vault = new Vault();
    const [li, ibrahim] = await namesRead(vault);
    const fetch = fakeFetch({ "/api/peers": PEERS });
    for (const passed of [li, ibrahim, `${li}_os`, `${ibrahim}_os`, `get_${li}_x`, `get_api_peers_${ibrahim}`]) {
      const counted = restoreToolInput(vault, "netbird_api", { operation: "get_api_peers", query: { count_by: passed } });
      const refused = await readNetbirdApi(counted as { operation: string }, fetch);
      expect(refused.ok).toBe(false);
      const sent = redactResult(vault, "netbird_api", refused.content);
      expect(sent).not.toMatch(/Li|İbrahim/);
      expect(JSON.parse(sent).error).toContain("Use one of this list's fields: yours, connected, last_seen, os,");
      expect(Object.keys(JSON.parse(sent))).toEqual(["operation", "error"]);
      const unknown = await readNetbirdApi(restoreToolInput(vault, "netbird_api", { operation: passed }) as { operation: string }, fetch);
      expect(JSON.parse(redactResult(vault, "netbird_api", unknown.content))).toEqual({ error: "Unknown operation." });
    }
  });

  test("an echo a result carries anyway is dropped on the way out", () => {
    const vault = new Vault();
    vault.mint("peer", "alice-laptop");
    const unknown = { operation: "get_api_peers_alice-laptop", count_by: "alice-laptop_os", error: "Unknown operation." };
    expect(JSON.parse(redactResult(vault, "netbird_api", JSON.stringify(unknown)))).toEqual({ error: "Unknown operation." });
    const refused = { operation: "get_api_peers", count_by: "alice-laptop_os", error: "Cannot count." };
    expect(JSON.parse(redactResult(vault, "netbird_api", JSON.stringify(refused)))).toEqual({ operation: "get_api_peers", error: "Cannot count." });
    const counted = { operation: "get_api_peers", count_by: "alice-laptop_os", counts: [] };
    expect(JSON.parse(redactResult(vault, "netbird_api", JSON.stringify(counted)))).toEqual({ operation: "get_api_peers", counts: [] });
  });

  test("a field that was counted keeps its name, whatever a peer is called", async () => {
    const vault = new Vault();
    vault.mint("peer", "os");
    vault.mint("peer", "connected");
    const outcome = await readNetbirdApi({ operation: "get_api_peers", query: { count_by: "connected" } }, fakeFetch({ "/api/peers": PEERS }));
    expect(JSON.parse(redactResult(vault, "netbird_api", outcome.content)).count_by).toBe("connected");
  });

  test("the kinds a search covers are not rewritten by a peer named like one", async () => {
    const vault = new Vault();
    vault.mint("peer", "network");
    vault.mint("user", "User");
    const outcome = await searchAccount({ term: "x", kinds: ["devices"] }, fakeFetch({}));
    expect(JSON.parse(redactResult(vault, "account_search", outcome.content)).error).toBe(JSON.parse(outcome.content).error);
  });
});

describe("an error from a read", () => {
  test("an unknown operation reaches the model as its error, not as a withheld result", async () => {
    const outcome = await readNetbirdApi({ operation: "get_api_everything" }, fakeFetch({}));
    const sent = JSON.parse(redactResult(new Vault(), "netbird_api", outcome.content));
    expect(sent).toEqual({ error: "Unknown operation." });
  });

  test("an operation name restored from a token is not sent back", async () => {
    const vault = new Vault();
    const token = vault.mint("peer", "alice-laptop");
    const input = restoreToolInput(vault, "netbird_api", { operation: token });
    const outcome = await readNetbirdApi(input as { operation: string }, fakeFetch({}));
    expect(outcome.content).not.toContain("alice-laptop");
    expect(JSON.parse(redactResult(vault, "netbird_api", outcome.content))).toEqual({ error: "Unknown operation." });
  });

  test("data with no profile is still withheld", () => {
    const sent = redactResult(new Vault(), "netbird_api", JSON.stringify({ operation: "get_api_everything", data: [{ name: "alice-laptop" }] }));
    expect(sent).not.toContain("alice-laptop");
    expect(sent).toContain("withheld");
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

describe("reverse proxy services", () => {
  const service = (id: string, status: string) => ({
    id,
    name: id,
    domain: `${id}.proxy.example`,
    enabled: true,
    targets: [{ target_id: "p1", target_type: "peer", protocol: "http", port: 8080, enabled: true, options: { custom_headers: { "X-Api-Key": "s3cret" } } }],
    auth: {
      password_auth: { enabled: true, password: "hunter2" },
      pin_auth: { enabled: false, pin: "1234" },
      header_auths: [{ enabled: true, header: "X-Token", value: "tok_live_abc" }],
    },
    meta: { created_at: "2026-10-01T00:00:00Z", status },
  });
  const fetch = fakeFetch({
    "/api/reverse-proxies/services": [service("wiki", "active"), service("grafana", "certificate_failed")],
  });

  test("say which authentication a service asks for, never its password, PIN, header value or custom headers", async () => {
    const page = await readNetbirdApi({ operation: "get_api_reverse_proxies_services" }, fetch);
    expect(page.content).toContain("certificate_failed");
    expect(page.content).toContain("X-Token");
    for (const secret of ["hunter2", "1234", "tok_live_abc", "s3cret", "X-Api-Key"]) {
      expect(page.content).not.toContain(secret);
    }
  });

  test("filter by status locally", async () => {
    const rows = await data(readNetbirdApi({ operation: "get_api_reverse_proxies_services", query: { status: "certificate_failed" } }, fetch));
    expect(rows.map((s: { id: string }) => s.id)).toEqual(["grafana"]);
  });
});

describe("a network's resources", () => {
  test("are read by the network's id, which the read requires", async () => {
    const fetch = fakeFetch({
      "/api/networks/n1/resources": [{ id: "r1", name: "Printer", type: "host", address: "10.10.2.23", enabled: true, groups: [{ id: "g1", name: "Office" }] }],
    });
    const rows = await data(readNetbirdApi({ operation: "get_api_networks_networkId_resources", id: "n1" }, fetch));
    expect(rows).toEqual([{ id: "r1", name: "Printer", type: "host", address: "10.10.2.23", enabled: true, groups: [{ id: "g1", name: "Office" }] }]);
    const missing = await readNetbirdApi({ operation: "get_api_networks_networkId_resources" }, fetch);
    expect(missing.content).toContain("needs the resource's `id`");
  });
});

describe("integration and credential reads", () => {
  const cases: [operation: string, path: string, body: unknown, kept: string, secrets: string[]][] = [
    [
      "get_api_identity_providers",
      "/api/identity-providers",
      [{ id: "idp1", type: "oidc", name: "Okta", issuer: "https://acme.okta.test", client_id: "0oa1client", client_secret: "cs_live_9f8e" }],
      "oidc",
      ["0oa1client", "cs_live_9f8e"],
    ],
    [
      "get_api_users_invites",
      "/api/users/invites",
      [{ id: "inv1", email: "new@acme.test", name: "New Hire", role: "user", expired: false, invite_token: "nbi_s3cretInvite" }],
      "expired",
      ["nbi_s3cretInvite"],
    ],
    [
      "get_api_event_streaming",
      "/api/event-streaming",
      [{ id: 7, account_id: "acc1", enabled: true, platform: "datadog", config: { api_key: "dd_k3y", api_url: "https://intake.datadog.test" } }],
      "datadog",
      ["dd_k3y", "intake.datadog.test", "acc1"],
    ],
    [
      "get_api_integrations_notifications_channels",
      "/api/integrations/notifications/channels",
      [{ id: "ch1", type: "webhook", enabled: true, event_types: ["user.join"], target: { url: "https://hooks.acme.test/T0/abc", headers: { Authorization: "Bearer wh_t0ken" } } }],
      "user.join",
      ["hooks.acme.test", "wh_t0ken"],
    ],
    [
      "get_api_integrations_scim_idp",
      "/api/integrations/scim-idp",
      [{ id: 3, enabled: true, provider: "jumpcloud", prefix: "nb-", auth_token: "nbs_scimT0ken", connector_id: "conn1" }],
      "jumpcloud",
      ["nbs_scimT0ken", "conn1"],
    ],
    [
      "get_api_agent_network_access_logs",
      "/api/agent-network/access-logs",
      { page: 1, page_size: 50, total_records: 1, total_pages: 1, data: [{ id: "l1", model: "gpt-6", decision: "allow", request_prompt: "my salary is 90k", response_completion: "noted" }] },
      "gpt-6",
      ["my salary is 90k", "noted"],
    ],
  ];

  test.each(cases)("%s keeps what it is for and drops its secrets", async (operation, path, body, kept, secrets) => {
    const outcome = await readNetbirdApi({ operation }, fakeFetch({ [path]: body }));
    expect(outcome.content).toContain(kept);
    for (const secret of secrets) expect(outcome.content).not.toContain(secret);
  });
});

describe("an id in the path", () => {
  test("may be an identity provider's user id, encoded, but never a path of its own", async () => {
    const fetch = fakeFetch({ "/api/users/google-oauth2%7C113331070247434659044/tokens": [] });
    expect(await data(readNetbirdApi({ operation: "get_api_users_userId_tokens", id: "google-oauth2|113331070247434659044" }, fetch))).toEqual([]);
    for (const id of ["../accounts", "a/b", "a?x=1", "..", "."]) {
      const refused = await readNetbirdApi({ operation: "get_api_users_userId_tokens", id }, fetch);
      expect(refused.content).toContain("needs the resource's `id`");
    }
  });

  test("that is a login leaves as a token, and the token reads the record it stands for", async () => {
    const vault = new Vault();
    const users = [{ id: "bob@acme.test", name: "Bob Stone", email: "bob@acme.test", role: "user" }];
    const fetch = fakeFetch({ "/api/users": users, "/api/users/bob%40acme.test/tokens": [{ id: "t1", name: "ci", created_by: "bob@acme.test" }] });
    const listed = redactResult(vault, "netbird_api", (await readNetbirdApi({ operation: "get_api_users" }, fetch)).content);
    expect(listed).not.toContain("bob@acme.test");
    const id = JSON.parse(listed).data[0].id as string;
    expect(id).toMatch(/^\[EMAIL_[a-z2-7]+\]$/);
    const input = restoreToolInput(vault, "netbird_api", { operation: "get_api_users_userId_tokens", id });
    const outcome = await readNetbirdApi(input as { operation: string }, fetch);
    expect(fetch.calls.at(-1)?.[0]).toBe("/api/users/bob%40acme.test/tokens");
    const tokens = JSON.parse(redactResult(vault, "netbird_api", outcome.content));
    expect(tokens.data[0].created_by).toBe(id);
  });
});

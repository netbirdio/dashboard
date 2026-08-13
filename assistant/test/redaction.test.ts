import { test, expect } from "bun:test";
import { Redactor, REDACTION } from "@/privacy/redaction.ts";

test("redacts a peer: identifiers → placeholders, operational fields kept", () => {
  const r = new Redactor();
  const peer = r.redact("peer", {
    id: "huiasdh676523",
    name: "prod-db-01",
    ip: "100.64.0.7",
    dns_label: "prod-db-01.netbird.cloud",
    user_id: "auth0|abc",
    serial_number: "SN-999",
    connected: true,
    os: "linux",
    version: "0.28.1",
    country_code: "DE",
    groups: [{ id: "g-raw", name: "servers", peers_count: 3 }],
  }) as Record<string, unknown>;

  expect(peer.id).toBe("{PEER_1}");
  expect(peer.name).toBe("{PEER_1}"); // same handle for id+name of the same peer
  // the handle carries both real id (for API calls) and display name (for the UI)
  expect(r.resolve("{PEER_1}")).toBe("huiasdh676523");
  expect(r.restore("Check {PEER_1}.")).toBe("Check prod-db-01.");
  expect(peer.ip).toBe("{IP_1}");
  expect(peer.dns_label).toBe("{DNS_1}");
  expect(peer.user_id).toBe("{USER_1}");
  expect(peer.serial_number).toBe("{SERIAL_1}");
  // operational fields survive so the model can still answer
  expect(peer.connected).toBe(true);
  expect(peer.os).toBe("linux");
  expect(peer.country_code).toBe("DE");
  // nested group redacted, count kept
  expect(peer.groups).toEqual([{ id: "{GROUP_1}", name: "{GROUP_1}", peers_count: 3 }]);
});

test("drops secrets: setup key value and user password never appear", () => {
  const r = new Redactor();
  const key = r.redact("setup_key", { id: "k1", name: "servers-key", key: "SECRET-XXewq", used_times: 4 }) as Record<string, unknown>;
  expect(key.key).toBeUndefined();
  expect(key.used_times).toBe(4);

  const user = r.redact("user", { id: "u1", name: "Ann", email: "ann@acme.io", password: "hunter2", role: "admin" }) as Record<string, unknown>;
  expect(user.password).toBeUndefined();
  expect(user.email).toBe("{EMAIL_1}");
  expect(user.role).toBe("admin");
});

test("placeholders are stable per real value and unique per value", () => {
  const r = new Redactor();
  expect(r.placeholder("peer", "raw-a")).toBe("{PEER_1}");
  expect(r.placeholder("peer", "raw-a")).toBe("{PEER_1}"); // stable
  expect(r.placeholder("peer", "raw-b")).toBe("{PEER_2}"); // distinct
  expect(r.placeholder("ip", "raw-a")).toBe("{IP_1}"); // type-scoped counter
});

test("restore reverses placeholders in model output, longest-first", () => {
  const r = new Redactor();
  // mint {PEER_1} … {PEER_12}: the closing brace means these can't collide by
  // prefix the way the old bare `peer_1` / `peer_12` form could.
  for (let i = 0; i < 12; i++) r.placeholder("peer", `raw-${i}`);
  const twelve = r.placeholder("peer", "raw-11"); // this is {PEER_12}
  expect(twelve).toBe("{PEER_12}");
  const out = r.restore(`Peer ${twelve} cannot reach {PEER_1}.`);
  expect(out).toBe("Peer raw-11 cannot reach raw-0.");
});

test("restore leaves unknown tokens untouched", () => {
  const r = new Redactor();
  r.placeholder("peer", "real");
  expect(r.restore("{PEER_1} and {PEER_9}")).toBe("real and {PEER_9}");
});

test("route CIDR and domains are treated as sensitive", () => {
  const r = new Redactor();
  const route = r.redact("route", {
    id: "r1", network: "10.0.0.0/24", domains: ["db.internal", "api.internal"],
    peer_groups: ["g1", "g2"], enabled: true, metric: 9999,
  }) as Record<string, unknown>;
  expect(route.network).toBe("{CIDR_1}");
  expect(route.domains).toEqual(["{DOMAIN_1}", "{DOMAIN_2}"]);
  expect(route.peer_groups).toEqual(["{GROUP_1}", "{GROUP_2}"]);
  expect(route.enabled).toBe(true);
  expect(route.metric).toBe(9999);
});

test("every resource declares a keep allowlist", () => {
  for (const [name, spec] of Object.entries(REDACTION)) {
    expect(Array.isArray(spec.keep), name).toBe(true);
  }
});

test("allowlist is default-deny: unlisted fields are dropped, not leaked", () => {
  const r = new Redactor();
  const peer = r.redact("peer", {
    id: "raw-id",
    connected: true, // allowlisted → kept
    ip: "10.0.0.1", // transform → placeholder
    // fields the API might add that we never anticipated — must NOT leak:
    secret_note: "internal only",
    owner_email: "boss@acme.io",
    location_lat: 52.5,
  }) as Record<string, unknown>;
  expect(peer.connected).toBe(true);
  expect(peer.ip).toBe("{IP_1}");
  expect(peer.secret_note).toBeUndefined();
  expect(peer.owner_email).toBeUndefined();
  expect(peer.location_lat).toBeUndefined();
  expect(Object.keys(peer).sort()).toEqual(["connected", "id", "ip"]);
});

test("a token first seen as a bare id upgrades its display when a name appears", () => {
  const r = new Redactor();
  // The management API returns bare ids for some relationships, so a resource's
  // first sighting can carry no name at all.
  const token = r.redact("peer", "69b666c4321c") as string;
  expect(r.restore(token)).toBe("69b666c4321c");

  // The same peer, now with its name: same token, readable answer.
  const row = r.redact("peer", { id: "69b666c4321c", name: "minecraft-host" }) as {
    id: string;
  };
  expect(row.id).toBe(token);
  expect(r.restore(`points at ${token}`)).toBe("points at minecraft-host");

  // A bare id afterwards must not undo the real name.
  r.redact("peer", "69b666c4321c");
  expect(r.restore(token)).toBe("minecraft-host");
});

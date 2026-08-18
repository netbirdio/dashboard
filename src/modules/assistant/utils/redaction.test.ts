import { describe, expect, it } from "vitest";
import { Redactor } from "@/modules/assistant/utils/redaction";
import {
  attributeIdentifiers,
  type CatalogEntry,
  rewriteNames,
} from "@/modules/assistant/utils/redaction";

describe("Redactor token displays", () => {
  it("keeps one token per resource across mints", () => {
    const r = new Redactor();
    const first = r.handle("peer", "peer-1", "build-01");
    const again = r.handle("peer", "peer-1", "build-01");
    expect(again).toBe(first);
    expect(r.restore(`${first} is up`)).toBe("build-01 is up");
  });

  it("upgrades a display that was only ever the id", () => {
    const r = new Redactor();
    // First sighting had no name to go on (a bare id in a nested field).
    const token = r.handle("peer", "69b666c4321c");
    expect(r.restore(token)).toBe("69b666c4321c");

    // A later call knows the name — same token, readable answer.
    expect(r.handle("peer", "69b666c4321c", "minecraft-host")).toBe(token);
    expect(r.restore(`points at ${token}`)).toBe("points at minecraft-host");
    expect(r.resolve(token)).toBe("69b666c4321c");
  });

  it("does not let a later id overwrite a real name", () => {
    const r = new Redactor();
    const token = r.handle("group", "g-1", "Build Servers");
    r.handle("group", "g-1");
    expect(r.restore(token)).toBe("Build Servers");
  });
});
/**
 * The rewriter edits what the user typed, so the cases that matter most are the
 * ones where it must NOT fire — and the ones where a typed value has to come out
 * as the *same* token the redacted data carries.
 */

const CATALOG: CatalogEntry[] = [
  { name: "eduards-macbook", type: "peer", id: "p1" },
  { name: "build-runner-01", type: "peer", id: "p2" },
  { name: "build", type: "group", id: "g1" },
  { name: "Contractors", type: "group", id: "g2" },
  { name: "All", type: "group", id: "g3" },
  { name: "db", type: "peer", id: "p3" },
  {
    name: "macbook.netbird.cloud",
    type: "dns",
    id: "macbook.netbird.cloud",
    scalar: true,
    owner: { type: "peer", id: "p1", name: "eduards-macbook", field: "hostname" },
  },
  {
    name: "100.84.175.167",
    type: "ip",
    id: "100.84.175.167",
    scalar: true,
    owner: { type: "peer", id: "p2", name: "build-runner-01", field: "ip" },
  },
];

/**
 * Enough of a `Redactor` for the rewriter: stable token per (type, real value).
 * `placeholder` and `handle` share the map on purpose — that's what makes a typed
 * value and a redacted field come out as the same token.
 */
function fakeRedactor(): Redactor {
  const seen = new Map<string, string>();
  const counts = new Map<string, number>();

  const mint = (type: string, real: string) => {
    const key = `${type} ${real}`;
    const existing = seen.get(key);
    if (existing) return existing;
    const n = (counts.get(type) ?? 0) + 1;
    counts.set(type, n);
    const token = `{${type.toUpperCase()}_${n}}`;
    seen.set(key, token);
    return token;
  };

  return {
    handle: (type: string, id: string) => mint(type, id),
    placeholder: (type: string, value: string) => mint(type, value),
  } as unknown as Redactor;
}

const rewrite = (text: string) => rewriteNames(text, CATALOG, fakeRedactor());

describe("rewriteNames: names", () => {
  it("swaps a peer name", () => {
    expect(rewrite("is eduards-macbook online?")).toBe("is {PEER_1} online?");
  });

  it("prefers the longest name over a shorter one it contains", () => {
    expect(rewrite("check build-runner-01")).toBe("check {PEER_1}");
  });

  it("leaves a longer hostname alone", () => {
    expect(rewrite("check build-runner-011")).toBe("check build-runner-011");
  });

  it("matches case-insensitively and keeps the rest of the sentence", () => {
    expect(rewrite("can CONTRACTORS reach it?")).toBe("can {GROUP_1} reach it?");
  });

  it("skips names too generic to be meant as names", () => {
    expect(rewrite("list all peers and all groups")).toBe(
      "list all peers and all groups",
    );
  });

  it("skips names under three characters", () => {
    expect(rewrite("is db up?")).toBe("is db up?");
  });

  it("does not match inside another word", () => {
    expect(rewrite("rebuild the buildkite runner")).toBe(
      "rebuild the buildkite runner",
    );
  });

  it("leaves already-tokenised text untouched", () => {
    expect(rewrite("is {PEER_1} online?")).toBe("is {PEER_1} online?");
  });

  it("handles two different resources in one sentence", () => {
    expect(rewrite("can Contractors reach eduards-macbook?")).toBe(
      "can {GROUP_1} reach {PEER_1}?",
    );
  });

  it("swaps a DNS label from the catalog", () => {
    expect(rewrite("open macbook.netbird.cloud")).toBe("open {DNS_1}");
  });

  it("passes empty input through", () => {
    expect(rewrite("")).toBe("");
  });
});

describe("rewriteNames: addresses and emails", () => {
  it("tokenises an IP the user typed", () => {
    expect(rewrite("where is 100.84.175.167?")).toBe("where is {IP_1}?");
  });

  it("gives the same IP one token", () => {
    expect(rewrite("is 100.84.175.167 the same as 100.84.175.167?")).toBe(
      "is {IP_1} the same as {IP_1}?",
    );
  });

  it("matches a CIDR before the address inside it", () => {
    expect(rewrite("route 10.0.0.0/24 please")).toBe("route {CIDR_1} please");
  });

  it("tokenises uncompressed IPv6", () => {
    expect(rewrite("ping fd00:1234:5678:9abc")).toBe("ping {IP_1}");
  });

  it("tokenises an email", () => {
    expect(rewrite("who is eduard@netbird.io?")).toBe("who is {EMAIL_1}?");
  });

  it("does not read a version number as an address", () => {
    expect(rewrite("peers on 0.28.9 need an update")).toBe(
      "peers on 0.28.9 need an update",
    );
  });

  it("works with no catalog at all", () => {
    expect(rewriteNames("where is 100.84.175.167?", [], fakeRedactor())).toBe(
      "where is {IP_1}?",
    );
  });
});

describe("attributeIdentifiers", () => {
  it("names the peer a typed hostname belongs to", () => {
    const redactor = fakeRedactor();
    const notes = attributeIdentifiers(
      "bring me to macbook.netbird.cloud",
      CATALOG,
      redactor,
    );
    expect(notes).toEqual(["{DNS_1} is the hostname of peer {PEER_1}"]);
    // The tokens in the note are the tokens in the rewritten message.
    expect(
      rewriteNames("bring me to macbook.netbird.cloud", CATALOG, redactor),
    ).toBe("bring me to {DNS_1}");
  });

  it("names the peer a typed address belongs to", () => {
    expect(
      attributeIdentifiers("where is 100.84.175.167?", CATALOG, fakeRedactor()),
    ).toEqual(["{IP_1} is the ip of peer {PEER_1}"]);
  });

  it("says nothing about values the message doesn't mention", () => {
    expect(
      attributeIdentifiers("list my peers", CATALOG, fakeRedactor()),
    ).toEqual([]);
  });

  it("says nothing for a resource name (the token already is the resource)", () => {
    expect(
      attributeIdentifiers("open eduards-macbook", CATALOG, fakeRedactor()),
    ).toEqual([]);
  });
});

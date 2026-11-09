import { describe, expect, it } from "vitest";
import { Relay } from "@/interfaces/Relay";
import {
  countMatchingPeers,
  formatCredentialsTTL,
  generateRelaySecret,
  MIN_SECRET_LENGTH,
  peerMatchesDistribution,
  relayAddressError,
  relayDeployCommand,
  resolvePeerRelays,
  secretError,
} from "./relayHelpers";

const peer = (groups: string[], country_code: string) => ({
  groups: groups.map((id) => ({ id, name: id })),
  country_code,
});

const relay = (overrides: Partial<Relay>): Relay => ({
  id: "r",
  name: "r",
  enabled: true,
  addresses: ["rels://relay.example.com:443"],
  credentials_ttl: 3600,
  distribution: { groups: [], locations: [] },
  instance_fallback: true,
  ...overrides,
});

describe("relayAddressError", () => {
  it.each([
    "rels://relay.example.com:443",
    "rel://relay.example.com",
    "rels://10.0.0.1:8443",
    "",
  ])("accepts %s", (address) => {
    expect(relayAddressError(address), address).toBe("");
  });

  it.each([
    ["https://relay.example.com", /rels:\/\//],
    ["relay.example.com:443", /rels:\/\//],
    ["rels://relay example.com", /valid address/],
    ["rels://relay.example.com:70000", /Port/],
  ])("rejects %s", (address, message) => {
    expect(relayAddressError(address), address).toMatch(message);
  });
});

describe("secretError", () => {
  it("requires a secret only when asked to", () => {
    expect(secretError("", true)).toMatch(/required/);
    expect(secretError("", false), "empty keeps the stored secret").toBe("");
  });

  it("enforces the minimum length", () => {
    expect(secretError("short", false)).toMatch(String(MIN_SECRET_LENGTH));
    expect(secretError("x".repeat(MIN_SECRET_LENGTH), true)).toBe("");
  });
});

describe("generateRelaySecret", () => {
  it("produces a URL-safe secret long enough to pass validation", () => {
    const secret = generateRelaySecret();
    expect(secret, "alphabet").toMatch(/^[A-Za-z0-9_-]+$/);
    expect(secretError(secret, true), "length").toBe("");
    expect(generateRelaySecret(), "randomness").not.toBe(secret);
  });
});

describe("formatCredentialsTTL", () => {
  it("uses option labels and falls back to units", () => {
    expect(formatCredentialsTTL(24 * 3600)).toBe("24 hours");
    expect(formatCredentialsTTL(3 * 24 * 3600)).toBe("3 days");
    expect(formatCredentialsTTL(2 * 3600)).toBe("2 hours");
    expect(formatCredentialsTTL(90 * 60)).toBe("90 minutes");
  });
});

describe("peerMatchesDistribution", () => {
  const distribution = {
    groups: ["grp-office"],
    locations: [{ country_code: "DE" }],
  };

  it("matches on any group or any country", () => {
    expect(peerMatchesDistribution(peer(["grp-office"], "US"), distribution))
      .toBe(true);
    expect(peerMatchesDistribution(peer([], "de"), distribution), "case")
      .toBe(true);
    expect(peerMatchesDistribution(peer(["grp-other"], "FR"), distribution))
      .toBe(false);
  });

  it("does not match peers without a known location on country alone", () => {
    expect(peerMatchesDistribution(peer([], ""), distribution)).toBe(false);
  });

  it("counts matching peers", () => {
    const peers = [peer(["grp-office"], ""), peer([], "DE"), peer([], "FR")];
    expect(countMatchingPeers(peers, distribution)).toBe(2);
    expect(countMatchingPeers(undefined, distribution)).toBe(0);
  });
});

describe("resolvePeerRelays", () => {
  const eu = relay({
    id: "eu",
    distribution: { groups: [], locations: [{ country_code: "DE" }] },
  });
  const office = relay({
    id: "office",
    distribution: { groups: ["grp-office"], locations: [] },
    instance_fallback: false,
  });

  it("keeps instance relays for peers no custom relay covers", () => {
    const result = resolvePeerRelays(peer([], "US"), [eu, office]);
    expect(result.relays, "no custom relays").toEqual([]);
    expect(result.instanceFallback, "instance relays").toBe(true);
  });

  it("hands out every matching relay", () => {
    const result = resolvePeerRelays(peer(["grp-office"], "DE"), [eu, office]);
    expect(result.relays.map((r) => r.id)).toEqual(["eu", "office"]);
  });

  it("disables fallback when any matching relay forbids it", () => {
    expect(resolvePeerRelays(peer([], "DE"), [eu, office]).instanceFallback)
      .toBe(true);
    expect(
      resolvePeerRelays(peer(["grp-office"], "DE"), [eu, office])
        .instanceFallback,
    ).toBe(false);
  });

  it("ignores disabled relays", () => {
    const result = resolvePeerRelays(peer(["grp-office"], "US"), [
      { ...office, enabled: false },
    ]);
    expect(result.relays).toEqual([]);
    expect(result.instanceFallback).toBe(true);
  });
});

describe("relayDeployCommand", () => {
  it("adds Let's Encrypt only for TLS addresses", () => {
    const tls = relayDeployCommand("rels://relay.acme.io:443", "s3cret").join(
      "\n",
    );
    expect(tls).toContain("NB_LETSENCRYPT_DOMAINS=relay.acme.io");
    expect(tls).toContain("NB_AUTH_SECRET=s3cret");

    const plain = relayDeployCommand("rel://10.0.0.1:443", "").join("\n");
    expect(plain).not.toContain("LETSENCRYPT");
    expect(plain, "placeholder when no secret").toContain("<auth-secret>");
  });
});

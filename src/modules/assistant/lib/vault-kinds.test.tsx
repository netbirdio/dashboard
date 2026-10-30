/*
  Every kind of value the vault tokenises, typed by the person and written
  back by the model, must make the whole trip: out as a token and nothing
  else, back as the value, in each place a value is restored to.
*/
import type { EveMessage } from "eve/react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { describe, expect, test } from "vitest";
import { restoreEveMessage } from "./convert";
import { TOKEN_PATTERN, Vault } from "./vault";

// What a person might type, by the kind its token is minted under.
const TYPED: [kind: string, value: string][] = [
  ["IP", "10.10.2.23"],
  ["IP", "fd00:4e42::1"],
  ["CIDR", "10.10.2.0/24"],
  ["CIDR", "fd00:4e42::/64"],
  ["EMAIL", "anna.schmidt@acme.test"],
  ["MAC", "aa:bb:cc:dd:ee:ff"],
  ["UUID", "3f9c1e2a-7b4d-4e8f-9a0b-1c2d3e4f5a6b"],
  ["PHONE", "+49 30 1234567"],
  ["CARD", "4111 1111 1111 1111"],
];

const message = (role: "user" | "assistant", text: string) =>
  ({ id: "m", role, parts: [{ type: "text", text }] }) as EveMessage;
const textOf = (m: EveMessage) => (m.parts[0] as { text: string }).text;
// Text only: GFM autolinks an email whatever its escapes, and the chat's own
// renderer shows a link to anywhere but NetBird's sites as its text.
const rendered = (markdown: string) =>
  renderToStaticMarkup(<Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>).replace(/<[^>]+>/g, "");

describe.each(TYPED)("a typed %s value (%s)", (kind, value) => {
  const typed = `okay. ${value}`;

  test("leaves the browser as one token of its kind, and nothing of the value", () => {
    const vault = new Vault();
    const scrubbed = vault.scrub(typed);
    const tokens = scrubbed.match(TOKEN_PATTERN) ?? [];
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.startsWith(`[${kind}_`)).toBe(true);
    expect(scrubbed).toBe(`okay. ${tokens[0]}`);
  });

  test("gets the same token every time it appears", () => {
    const vault = new Vault();
    expect(vault.scrub(value)).toBe(vault.scrub(`${value}`));
  });

  test("shows in the person's own message exactly as typed", () => {
    const vault = new Vault();
    expect(textOf(restoreEveMessage(vault, message("user", vault.scrub(typed))))).toBe(typed);
  });

  test("reads as the value in the model's answer, rendered as markdown", () => {
    const vault = new Vault();
    const token = vault.scrub(value);
    const answer = textOf(restoreEveMessage(vault, message("assistant", `The address is ${token}.`)));
    expect(rendered(answer)).toBe(`The address is ${value}.`);
  });

  test("reaches a tool as the real value", () => {
    const vault = new Vault();
    const token = vault.scrub(value);
    expect(vault.restoreString(token, "real")).toBe(value);
    expect(vault.restoreValue({ query: { search: token } }, "real")).toEqual({ query: { search: value } });
  });

  test("stays a token inside a link", () => {
    const vault = new Vault();
    const token = vault.scrub(value);
    expect(vault.restoreMarkdown(`[open](https://evil.example/?v=${token})`)).toContain(token);
  });
});

describe("names the vault learned from a read", () => {
  test("a peer name typed later becomes the read's token, and restores to the name", () => {
    const vault = new Vault();
    const token = vault.mint("peer", "berlin-office-gw");
    const scrubbed = vault.scrub("why is Berlin-Office-GW offline?");
    expect(scrubbed).toBe(`why is ${token} offline?`);
    expect(vault.restoreText(scrubbed)).toBe("why is berlin-office-gw offline?");
  });

  test.each([
    ["domain", "wiki.acme.test"],
    ["dns", "alice-laptop.netbird.cloud"],
    ["city", "Frankfurt am Main"],
    ["serial", "C02XK0ABJGH5"],
  ])("a %s minted from a read restores to its value", (kind, value) => {
    const vault = new Vault();
    const token = vault.mint(kind, value);
    expect(token.startsWith(`[${kind.toUpperCase()}_`)).toBe(true);
    expect(vault.scrub(value)).toBe(token);
    expect(vault.restoreString(token, "real")).toBe(value);
  });
});

describe("a credential", () => {
  test.each([
    "nbp_abcdefghijklmnopqrstuvwxyz0123456789",
    "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
    "postgres://admin:hunter2@db.acme.test:5432/app",
  ])("typed as %s, never comes back, not even in the person's own message", (secret) => {
    const vault = new Vault();
    const scrubbed = vault.scrub(`use ${secret}`);
    expect(scrubbed).not.toContain(secret);
    expect(textOf(restoreEveMessage(vault, message("user", scrubbed)))).toBe("use [redacted credential]");
    expect(vault.restoreString(scrubbed, "real")).toBe(scrubbed);
  });
});

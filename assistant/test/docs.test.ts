import { test, expect, beforeAll } from "bun:test";
import { setEnv } from "./env.ts";
import { tokenize, deriveEntry, rankEntries, type DocEntry } from "@/docs/catalog.ts";
import { rawCandidates, cleanMdx, htmlToText, fetchDoc, DocFetchError } from "@/docs/fetch.ts";
import { runDocTool, isDocTool } from "@/docs/execute.ts";
import { toolSpecs, isServerTool, isKnownTool } from "@/llm/tools.ts";

beforeAll(() => setEnv()); // fetch guards call loadConfig()

// ── catalog: derivation + ranking (pure) ─────────────────────────────────────

test("deriveEntry pulls title + section from a docs URL", () => {
  expect(deriveEntry("https://docs.netbird.io/manage/dns/dns-settings")).toEqual({
    url: "https://docs.netbird.io/manage/dns/dns-settings",
    title: "Dns Settings",
    section: "manage",
  });
  expect(deriveEntry("https://docs.netbird.io/").title).toBe("Introduction");
});

test("tokenize drops stopwords and short/noise tokens", () => {
  expect(tokenize("How do I set up split DNS in NetBird?")).toEqual(["set", "up", "split", "dns"]);
});

test("rankEntries ranks title/slug/section matches, ignores misses", () => {
  const entries: DocEntry[] = [
    { url: "https://docs.netbird.io/manage/dns/dns-settings", title: "Dns Settings", section: "manage" },
    { url: "https://docs.netbird.io/manage/peers", title: "Peers", section: "manage" },
    { url: "https://docs.netbird.io/manage/dns/nameserver-groups", title: "Nameserver Groups", section: "manage" },
  ];
  const hits = rankEntries(entries, "dns settings", 5);
  expect(hits[0]!.url).toContain("dns-settings"); // title match wins
  expect(hits.every((h) => h.score > 0)).toBe(true);
  expect(hits.find((h) => h.url.endsWith("/peers"))).toBeUndefined(); // no overlap → excluded
});

test("rankEntries returns nothing for an all-stopword query", () => {
  const entries: DocEntry[] = [{ url: "https://docs.netbird.io/x", title: "X", section: "x" }];
  expect(rankEntries(entries, "how do i", 5)).toEqual([]);
});

// ── fetch helpers (pure) ─────────────────────────────────────────────────────

test("rawCandidates maps a doc URL to leaf then index MDX", () => {
  expect(rawCandidates("https://docs.netbird.io/manage/dns/dns-settings")).toEqual([
    "https://raw.githubusercontent.com/netbirdio/docs/main/src/pages/manage/dns/dns-settings.mdx",
    "https://raw.githubusercontent.com/netbirdio/docs/main/src/pages/manage/dns/dns-settings/index.mdx",
  ]);
  expect(rawCandidates("https://docs.netbird.io/")[0]).toEndWith("introduction.mdx");
});

test("cleanMdx strips import/export lines and lifts the description", () => {
  const mdx = [
    "export const description = 'Control DNS behavior'",
    'import {Note} from "@/components/mdx";',
    "",
    "# DNS Settings",
    "Body text.",
  ].join("\n");
  const { text, description } = cleanMdx(mdx);
  expect(description).toBe("Control DNS behavior");
  expect(text).toBe("# DNS Settings\nBody text.");
  expect(text).not.toContain("import");
});

test("htmlToText drops script/style and decodes entities", async () => {
  const html = `<html><body><nav>menu</nav><main><h1>Hi &amp; bye</h1><script>evil()</script><p>I&#x27;m text</p></main></body></html>`;
  const text = await htmlToText(html);
  expect(text).toContain("Hi & bye");
  expect(text).toContain("I'm text");
  expect(text).not.toContain("evil");
  expect(text).not.toContain("menu");
});

// ── execute: guards that do not touch the network ────────────────────────────

test("isDocTool / isServerTool agree that docs tools run server-side", () => {
  for (const name of ["search_docs", "fetch_doc"]) {
    expect(isDocTool(name)).toBe(true);
    expect(isServerTool(name)).toBe(true);
    expect(isKnownTool(name)).toBe(true);
  }
  expect(isServerTool("list_peers")).toBe(false);
});

test("runDocTool rejects malformed input before any fetch", async () => {
  const badSearch = await runDocTool("search_docs", { query: "" });
  expect(badSearch.ok).toBe(false);
  const badFetch = await runDocTool("fetch_doc", {});
  expect(badFetch.ok).toBe(false);
});

test("fetch_doc refuses a disallowed host (SSRF guard) with no network call", async () => {
  const res = await runDocTool("fetch_doc", { url: "https://evil.example.com/x" });
  expect(res.ok).toBe(false);
  expect(res.content).toContain("Could not fetch");
  await expect(fetchDoc("http://docs.netbird.io/x")).rejects.toBeInstanceOf(DocFetchError); // http, not https
});

// ── tool advertisement respects DOCS_ENABLED ─────────────────────────────────

test("toolSpecs includes doc tools only when server tools are enabled", () => {
  const withDocs = toolSpecs(true).map((t) => t.name);
  const withoutDocs = toolSpecs(false).map((t) => t.name);
  expect(withDocs).toContain("search_docs");
  expect(withDocs).toContain("fetch_doc");
  expect(withoutDocs).not.toContain("search_docs");
  expect(withoutDocs).not.toContain("fetch_doc");
  expect(withoutDocs).toContain("list_peers"); // client tools unaffected
});

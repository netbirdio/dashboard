import { beforeAll, expect, spyOn, test } from "bun:test";
import { isServerTool, runServerTool, TOOLS } from "@/agent/tools/registry.ts";
import {
  cleanMdx,
  deriveEntry,
  type DocEntry,
  DocFetchError,
  fetchDoc,
  htmlToText,
  rankEntries,
  rawCandidates,
} from "@/lib/docs.ts";
import { setEnv } from "./env.ts";

beforeAll(() => setEnv());

test("deriveEntry pulls title + section from a docs URL", () => {
  expect(deriveEntry("https://docs.netbird.io/manage/dns/dns-settings")).toEqual({
    url: "https://docs.netbird.io/manage/dns/dns-settings",
    title: "Dns Settings",
    section: "manage",
  });
  expect(deriveEntry("https://docs.netbird.io/").title).toBe("Introduction");
});

test("rankEntries ranks title/slug/section matches, ignores misses", () => {
  const entries: DocEntry[] = [
    { url: "https://docs.netbird.io/manage/dns/dns-settings", title: "Dns Settings", section: "manage" },
    { url: "https://docs.netbird.io/manage/peers", title: "Peers", section: "manage" },
    { url: "https://docs.netbird.io/manage/dns/nameserver-groups", title: "Nameserver Groups", section: "manage" },
  ];
  const hits = rankEntries(entries, "dns settings", 5);
  expect(hits[0]!.url).toContain("dns-settings");
  expect(hits.every((h) => h.score > 0)).toBe(true);
  expect(hits.find((h) => h.url.endsWith("/peers"))).toBeUndefined();
});

test("rankEntries returns nothing for an all-stopword query", () => {
  const entries: DocEntry[] = [{ url: "https://docs.netbird.io/x", title: "X", section: "x" }];
  expect(rankEntries(entries, "how do i", 5)).toEqual([]);
});

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

test("the docs tools are registered as server-side", () => {
  for (const name of ["search_docs", "fetch_doc"]) {
    expect(isServerTool(name)).toBe(true);
    expect(name in TOOLS).toBe(true);
  }
  expect(isServerTool("list_peers")).toBe(false);
});

test("the docs runners reject malformed input before any fetch", async () => {
  expect((await runServerTool("search_docs", { query: "" })).ok).toBe(false);
  expect((await runServerTool("fetch_doc", {})).ok).toBe(false);
});

test("fetch_doc refuses a disallowed host (SSRF guard) with no network call", async () => {
  const spy = spyOn(globalThis, "fetch").mockImplementation(((): never => {
    throw new Error("the guard let a request through");
  }) as unknown as typeof fetch);
  try {
    const res = await runServerTool("fetch_doc", { url: "https://evil.example.com/x" });
    expect(res.ok).toBe(false);
    expect(res.content).toContain("Could not fetch");
    // The point of an SSRF guard is that the request never leaves the process,
    // so the allowlist has to be checked before the socket, not after.
    await expect(fetchDoc("http://docs.netbird.io/x")).rejects.toBeInstanceOf(DocFetchError);
    expect(spy).toHaveBeenCalledTimes(0);
  } finally {
    spy.mockRestore();
  }
});


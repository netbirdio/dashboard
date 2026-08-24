import type { UIMessage, UIMessageChunk } from "ai";
import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import {
  analyzeText,
  piiCacheKeysForTests,
  PiiVault,
  type PresidioFinding,
  resetPiiCacheForTests,
  restoreChunkStream,
  scrubMessages,
} from "@/lib/pii.ts";
import { setEnv } from "./env.ts";

const realFetch = globalThis.fetch;
const realError = console.error;

function mockAnalyzer(handler: (text: string) => PresidioFinding[] | Response): void {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const { text } = JSON.parse(String(init?.body)) as { text: string };
    const result = handler(text);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result), { status: 200 });
  }) as typeof fetch;
}

const find = (text: string, needle: string, entity_type: string): PresidioFinding => {
  const start = text.indexOf(needle);
  return { entity_type, start, end: start + needle.length, score: 0.9 };
};

async function pump(vault: PiiVault, chunks: UIMessageChunk[]): Promise<UIMessageChunk[]> {
  const ts = restoreChunkStream(vault);
  const out: UIMessageChunk[] = [];
  const reading = (async () => {
    const reader = ts.readable.getReader();
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      out.push(r.value);
    }
  })();
  const writer = ts.writable.getWriter();
  for (const c of chunks) await writer.write(c);
  await writer.close();
  await reading;
  return out;
}

const textOf = (chunks: UIMessageChunk[]): string =>
  chunks.map((c) => (c.type === "text-delta" ? c.delta : "")).join("");

// The fail-open paths log the outage they swallow, by design. Silenced here so
// that a `pii backstop unavailable` line on a test run means a real outage and
// not a passing test.
beforeEach(() => {
  setEnv();
  resetPiiCacheForTests();
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

afterAll(() => {
  console.error = realError;
});

test("scrubText mints tokens and restore brings the value back", async () => {
  mockAnalyzer((text) => (text.includes("Milo Kern") ? [find(text, "Milo Kern", "PERSON")] : []));
  const vault = new PiiVault();

  const scrubbed = await vault.scrubText("add Milo Kern's laptop to Build Servers");
  expect(scrubbed).toBe("add [REDACTED_PERSON_1]'s laptop to Build Servers");
  expect(vault.restoreText(scrubbed)).toBe("add Milo Kern's laptop to Build Servers");
  // Tolerates the mangled forms models write.
  expect(vault.restoreText("ok, REDACTED PERSON 1 it is")).toBe("ok, Milo Kern it is");
  expect(vault.restoreDeep({ a: ["[REDACTED_PERSON_1]"], n: 1 })).toEqual({
    a: ["Milo Kern"],
    n: 1,
  });
});

test("same value keeps one token; overlapping findings keep the first", () => {
  const vault = new PiiVault();
  const text = "Milo Kern and Milo Kern";
  const out = vault.applyFindings(text, [
    find(text, "Milo Kern", "PERSON"),
    { entity_type: "PERSON", start: 14, end: 23, score: 0.9 },
    // Overlaps the first finding — dropped.
    { entity_type: "LOCATION", start: 5, end: 12, score: 0.9 },
  ]);
  expect(out).toBe("[REDACTED_PERSON_1] and [REDACTED_PERSON_1]");
});

test("fails open when the analyzer is unreachable, then trips the breaker", async () => {
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts++;
    throw new Error("connection refused");
  }) as unknown as typeof fetch;
  const vault = new PiiVault();
  expect(await vault.scrubText("call Milo Kern")).toBe("call Milo Kern");
  expect(vault.size).toBe(0);
  // The breaker is open now: further scrubs skip the network entirely.
  expect(await vault.scrubText("mail Milo Kern")).toBe("mail Milo Kern");
  expect(attempts).toBe(1);
});

test("analyzeText caches by text", async () => {
  let calls = 0;
  mockAnalyzer(() => {
    calls++;
    return [];
  });
  await analyzeText("same text");
  await analyzeText("same text");
  expect(calls).toBe(1);
});

test("scrubMessages touches only user and assistant text parts", async () => {
  mockAnalyzer((text) => (text.includes("Milo Kern") ? [find(text, "Milo Kern", "PERSON")] : []));
  const vault = new PiiVault();
  const messages = [
    {
      id: "m1",
      role: "user",
      parts: [{ type: "text", text: "who is Milo Kern?" }],
    },
    {
      id: "m2",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "Milo Kern must be an owner" },
        { type: "text", text: "Milo Kern owns [PEER_1]" },
      ],
    },
  ] as unknown as UIMessage[];

  await scrubMessages(messages, vault);

  expect(messages[0]!.parts[0]).toMatchObject({ text: "who is [REDACTED_PERSON_1]?" });
  // Reasoning is signature-protected — byte-identical or the provider rejects it.
  expect(messages[1]!.parts[0]).toMatchObject({ text: "Milo Kern must be an owner" });
  // The dashboard's own tokens pass through untouched.
  expect(messages[1]!.parts[1]).toMatchObject({ text: "[REDACTED_PERSON_1] owns [PEER_1]" });
});

test("restores tokens split across stream chunks", async () => {
  const vault = new PiiVault();
  vault.applyFindings("Milo Kern", [find("Milo Kern", "Milo Kern", "PERSON")]);

  const out = await pump(vault, [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "ask [REDACTED_PER" },
    { type: "text-delta", id: "t1", delta: "SON_1] about it" },
    { type: "text-end", id: "t1" },
  ]);

  expect(textOf(out)).toBe("ask Milo Kern about it");
});

test("flushes a held partial before the part ends", async () => {
  const vault = new PiiVault();
  vault.applyFindings("Milo Kern", [find("Milo Kern", "Milo Kern", "PERSON")]);

  const out = await pump(vault, [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "x [RED" },
    { type: "text-end", id: "t1" },
  ]);

  expect(textOf(out)).toBe("x [RED");
  expect(out.at(-1)).toMatchObject({ type: "text-end" });
});

test("restores tool inputs and data parts deeply", async () => {
  const vault = new PiiVault();
  vault.applyFindings("Milo Kern", [find("Milo Kern", "Milo Kern", "PERSON")]);

  const out = await pump(vault, [
    {
      type: "tool-input-available",
      toolCallId: "c1",
      toolName: "cc_add",
      input: { name: "Machine of [REDACTED_PERSON_1]" },
    },
    {
      type: "data-suggestions",
      data: { question: "Add [REDACTED_PERSON_1]?", quick_replies: ["yes"] },
    } as UIMessageChunk,
  ]);

  expect(out[0]).toMatchObject({ input: { name: "Machine of Milo Kern" } });
  expect(out[1]).toMatchObject({ data: { question: "Add Milo Kern?" } });
});

test("passes everything through untouched when nothing was scrubbed", async () => {
  const vault = new PiiVault();
  const chunks: UIMessageChunk[] = [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "plain [PEER_1] answer" },
    { type: "text-end", id: "t1" },
  ];
  expect(await pump(vault, chunks)).toEqual(chunks);
});

test("a token minted after an earlier restore is still restored", () => {
  const vault = new PiiVault();
  vault.applyFindings("Milo Kern", [find("Milo Kern", "Milo Kern", "PERSON")]);
  expect(vault.restoreText("[REDACTED_PERSON_1]")).toBe("Milo Kern");

  vault.applyFindings("Ada Vance", [find("Ada Vance", "Ada Vance", "PERSON")]);
  expect(vault.restoreText("[REDACTED_PERSON_1] and [REDACTED_PERSON_2]")).toBe(
    "Milo Kern and Ada Vance",
  );
});

test("the longest token body wins, so token 10 is not eaten by token 1", () => {
  const vault = new PiiVault();
  for (let i = 1; i <= 10; i++) {
    const text = `person ${i}`;
    vault.applyFindings(text, [{ entity_type: "PERSON", start: 0, end: text.length, score: 0.9 }]);
  }
  expect(vault.restoreText("[REDACTED_PERSON_10] then [REDACTED_PERSON_1]")).toBe(
    "person 10 then person 1",
  );
  expect(vault.restoreText("REDACTED PERSON 10")).toBe("person 10");
});

const namesAnalyzer = (names: string[]) => (text: string) =>
  names.filter((n) => text.includes(n)).map((n) => find(text, n, "PERSON"));

const transcript = (): UIMessage[] =>
  [
    { id: "m1", role: "user", parts: [{ type: "text", text: "Ada Vance knows Milo Kern" }] },
    {
      id: "m2",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "Rui Sato is the owner" },
        { type: "text", text: "Rui Sato knows Ada Vance too" },
      ],
    },
    { id: "m3", role: "user", parts: [{ type: "text", text: "and Milo Kern?" }] },
  ] as unknown as UIMessage[];

const scrubbedTexts = (messages: UIMessage[]): string[] =>
  messages.flatMap((m) =>
    m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text),
  );

test("scrubMessages numbers tokens in message and part order, identically on a resend", async () => {
  mockAnalyzer(namesAnalyzer(["Ada Vance", "Milo Kern", "Rui Sato"]));

  const first = transcript();
  await scrubMessages(first, new PiiVault());
  expect(scrubbedTexts(first)).toEqual([
    "[REDACTED_PERSON_1] knows [REDACTED_PERSON_2]",
    "[REDACTED_PERSON_3] knows [REDACTED_PERSON_1] too",
    "and [REDACTED_PERSON_2]?",
  ]);

  // The same conversation re-sent must produce the same tokens, or the
  // provider's prompt cache misses and the model sees them renumbered.
  resetPiiCacheForTests();
  const second = transcript();
  await scrubMessages(second, new PiiVault());
  expect(scrubbedTexts(second)).toEqual(scrubbedTexts(first));
});

test("scrubMessages analyzes the whole transcript concurrently and dedupes", async () => {
  let inFlight = 0;
  let peak = 0;
  let calls = 0;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const { text } = JSON.parse(String(init?.body)) as { text: string };
    calls++;
    peak = Math.max(peak, ++inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return new Response(JSON.stringify(namesAnalyzer(["Milo Kern"])(text)), { status: 200 });
  }) as typeof fetch;

  const messages = [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `round ${i} with Milo Kern` }],
    })),
    { id: "dup", role: "user", parts: [{ type: "text", text: "round 0 with Milo Kern" }] },
  ] as unknown as UIMessage[];

  await scrubMessages(messages, new PiiVault());

  expect(peak).toBe(6);
  // Six distinct texts, prefetched once each; the mint pass runs off the cache.
  expect(calls).toBe(6);
  expect(scrubbedTexts(messages).at(-1)).toBe("round 0 with [REDACTED_PERSON_1]");
});

test("scrubMessages fans out without an unhandled rejection when the analyzer is down", async () => {
  globalThis.fetch = (async () => {
    throw new Error("connection refused");
  }) as unknown as typeof fetch;

  const messages = transcript();
  await scrubMessages(messages, new PiiVault());

  expect(scrubbedTexts(messages)).toEqual(scrubbedTexts(transcript()));
});

test("the analysis cache is keyed by a hash, never by the analysed text", async () => {
  mockAnalyzer((text) => [find(text, "Milo Kern", "PERSON")]);
  const secret = "my name is Milo Kern and my card is 4111 1111 1111 1111";
  await analyzeText(secret);

  const keys = piiCacheKeysForTests();
  expect(keys.length).toBe(1);
  for (const key of keys) {
    expect(key).not.toContain("Milo");
    expect(key).not.toContain("4111");
    expect(secret).not.toContain(key);
  }
});

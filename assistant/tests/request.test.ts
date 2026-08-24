import { expect, test } from "bun:test";
import { MAX_MESSAGES, MAX_REQUEST_BYTES, validateChatRequest } from "@/agent/request.ts";
import { setEnv } from "./env.ts";

setEnv();

const userMessage = (text: string, id = "m1") => ({
  id,
  role: "user" as const,
  parts: [{ type: "text" as const, text }],
});

const post = (body: unknown): Request =>
  new Request("https://x/v1/chat", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("accepts a well-formed request", async () => {
  const r = await validateChatRequest(post({ id: "conv-1", messages: [userMessage("hi")] }));
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.id).toBe("conv-1");
    expect(r.value.messages).toHaveLength(1);
  }
});

// Bun caps the body at the transport layer in production; this is the in-app
// check that catches it when the app is driven directly.
test("rejects an oversized body with 413", async () => {
  const filler = "x".repeat(MAX_REQUEST_BYTES);
  expect(await validateChatRequest(post({ messages: [userMessage(filler)] }))).toMatchObject({
    ok: false,
    status: 413,
    reason: "too_large",
  });
});

test("rejects too many messages with 413", async () => {
  const messages = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => userMessage("x", `m${i}`));
  expect(await validateChatRequest(post({ messages }))).toMatchObject({
    ok: false,
    status: 413,
    reason: "too_many_messages",
  });
});

test("rejects a body that isn't JSON at all", async () => {
  expect(await validateChatRequest(post("{nope"))).toMatchObject({
    ok: false,
    status: 400,
    reason: "invalid_json",
  });
});

test("rejects a malformed body with 400", async () => {
  expect(await validateChatRequest(post({ messages: [] }))).toMatchObject({
    ok: false,
    status: 400,
    reason: "invalid_body",
  });
  expect(await validateChatRequest(post({ nope: true }))).toMatchObject({
    ok: false,
    status: 400,
  });
});

test("rejects messages that aren't valid UI messages", async () => {
  const bad = [
    [{ role: "user", content: "the old wire format" }],
    [{ id: "m1", role: "user", parts: [{ type: "banana", text: "hi" }] }],
    [42],
  ];
  for (const messages of bad) {
    expect(await validateChatRequest(post({ messages }))).toMatchObject({
      ok: false,
      status: 400,
    });
  }
});

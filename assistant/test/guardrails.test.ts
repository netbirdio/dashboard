import { test, expect } from "bun:test";
import { setEnv } from "./env.ts";
import {
  MAX_MESSAGES,
  MAX_REQUEST_BYTES,
  lastUserText,
  validateChatRequest,
  shouldBlockInput,
} from "@/guardrails.ts";

setEnv();

const userMessage = (text: string, id = "m1") => ({
  id,
  role: "user" as const,
  parts: [{ type: "text" as const, text }],
});

test("accepts a well-formed request", async () => {
  const r = await validateChatRequest({ messages: [userMessage("hi")] }, 20);
  expect(r.ok).toBe(true);
});

test("rejects an oversized body with 413", async () => {
  const r = await validateChatRequest({ messages: [userMessage("hi")] }, MAX_REQUEST_BYTES + 1);
  expect(r).toMatchObject({ ok: false, status: 413 });
});

test("rejects too many messages with 413", async () => {
  const messages = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => userMessage("x", `m${i}`));
  expect(await validateChatRequest({ messages }, 40)).toMatchObject({ ok: false, status: 413 });
});

test("rejects a malformed body with 400", async () => {
  expect(await validateChatRequest({ messages: [] }, 10)).toMatchObject({ ok: false, status: 400 });
  expect(await validateChatRequest({ nope: true }, 10)).toMatchObject({ ok: false, status: 400 });
});

test("rejects messages that aren't valid UI messages", async () => {
  const bad = [
    [{ role: "user", content: "the old wire format" }],
    [{ id: "m1", role: "user", parts: [{ type: "banana", text: "hi" }] }],
    [42],
  ];
  for (const messages of bad) {
    expect(await validateChatRequest({ messages }, 100)).toMatchObject({
      ok: false,
      status: 400,
    });
  }
});

test("lastUserText joins the newest user message's text parts", () => {
  const messages = [
    userMessage("first", "m1"),
    { id: "m2", role: "assistant" as const, parts: [{ type: "text" as const, text: "reply" }] },
    userMessage("second", "m3"),
  ];
  expect(lastUserText(messages)).toBe("second");
  expect(lastUserText([])).toBe("");
});

test("shouldBlockInput is a no-op while the classifier is disabled", async () => {
  expect(await shouldBlockInput("hi")).toBe(false);
});

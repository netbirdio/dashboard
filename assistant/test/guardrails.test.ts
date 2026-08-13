import { test, expect } from "bun:test";
import { setEnv } from "./env.ts";
import { validateChatRequest, shouldBlockInput } from "@/guardrails/input.ts";

setEnv({ MAX_MESSAGES: "3", MAX_REQUEST_BYTES: "1000" });

test("accepts a well-formed request", () => {
  const r = validateChatRequest({ messages: [{ role: "user", content: "hi" }] }, 20);
  expect(r.ok).toBe(true);
});

test("rejects an oversized body with 413", () => {
  const r = validateChatRequest({ messages: [{ role: "user", content: "hi" }] }, 5000);
  expect(r).toMatchObject({ ok: false, status: 413 });
});

test("rejects too many messages with 413", () => {
  const messages = Array.from({ length: 4 }, () => ({ role: "user" as const, content: "x" }));
  expect(validateChatRequest({ messages }, 40)).toMatchObject({ ok: false, status: 413 });
});

test("rejects a malformed body with 400", () => {
  expect(validateChatRequest({ messages: [] }, 10)).toMatchObject({ ok: false, status: 400 });
  expect(validateChatRequest({ nope: true }, 10)).toMatchObject({ ok: false, status: 400 });
});

test("shouldBlockInput is a no-op while the classifier is disabled", async () => {
  expect(await shouldBlockInput({ messages: [{ role: "user", content: "hi" }] })).toBe(false);
});

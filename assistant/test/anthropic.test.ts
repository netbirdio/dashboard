/** Translation is pure and offline — no API key or network needed. */
import { describeFailure, LlmError } from "@/llm/errors.ts";
import { test, expect } from "bun:test";
import { toAnthropicMessages, toAnthropicTools } from "@/llm/anthropic.ts";
import type { LlmMessage, LlmTool } from "@/types.ts";

test("string content passes through unchanged", () => {
  const [msg] = toAnthropicMessages([{ role: "user", content: "hello" }]);
  expect(msg).toEqual({ role: "user", content: "hello" });
});

test("tool_result maps neutral toolUseId → Anthropic tool_use_id", () => {
  const messages: LlmMessage[] = [
    { role: "user", content: [{ type: "tool_result", toolUseId: "abc", content: "42 peers", isError: false }] },
  ];
  const [msg] = toAnthropicMessages(messages);
  expect(msg!.content).toEqual([
    { type: "tool_result", tool_use_id: "abc", content: "42 peers", is_error: false },
  ]);
});

test("tool_use and text blocks translate faithfully", () => {
  const messages: LlmMessage[] = [
    {
      role: "assistant",
      content: [
        { type: "text", text: "checking" },
        { type: "tool_use", id: "t1", name: "list_peers", input: { q: 1 } },
      ],
    },
  ];
  const [msg] = toAnthropicMessages(messages);
  expect(msg!.content).toEqual([
    { type: "text", text: "checking" },
    { type: "tool_use", id: "t1", name: "list_peers", input: { q: 1 } },
  ]);
});

test("only the last tool carries a cache_control marker", () => {
  const tools: LlmTool[] = [
    { name: "a", description: "d", inputSchema: { type: "object" } },
    { name: "b", description: "d", inputSchema: { type: "object" } },
  ];
  const out = toAnthropicTools(tools);
  expect(out[0]!.cache_control).toBeUndefined();
  expect(out[1]!.cache_control).toEqual({ type: "ephemeral" });
});

test("describeFailure gives the user something to do, and never leaks internals", () => {
  const overloaded = describeFailure(
    new LlmError("overloaded", true, "529 upstream said overloaded_error"),
  );
  expect(overloaded.code).toBe("overloaded");
  expect(overloaded.retryable).toBe(true);
  expect(overloaded.message.toLowerCase()).toContain("try again");
  // No status codes, provider names or exception text in what the user reads.
  expect(overloaded.message).not.toContain("529");
  expect(overloaded.message).not.toContain("overloaded_error");
  expect(overloaded.message.toLowerCase()).not.toContain("anthropic");

  // A rejected key is nobody's retry — it needs a person.
  const auth = describeFailure(new LlmError("auth", false, "401 invalid x-api-key"));
  expect(auth.retryable).toBe(false);
  expect(auth.message).toContain("administrator");
  expect(auth.message).not.toContain("api-key");

  // An unclassified throw still says something useful.
  const unknown = describeFailure(new Error("boom"));
  expect(unknown.code).toBe("unknown");
  expect(unknown.message).not.toContain("boom");
});

test("describeFailure distinguishes a cut-off answer from nothing at all", () => {
  const cutShort = describeFailure(new LlmError("timeout", true, "timed out"), true);
  expect(cutShort.message).toContain("cut short");
  expect(describeFailure(new LlmError("timeout", true, "timed out")).message).not.toContain(
    "cut short",
  );
});

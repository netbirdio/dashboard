import { APICallError } from "ai";
import { beforeEach, expect, test } from "bun:test";
import { supportsAdaptiveThinking, supportsEffort } from "@/agent/model.ts";
import { classifyLlmError, failureMessage } from "@/errors.ts";
import { setEnv } from "./env.ts";

beforeEach(() => setEnv());

test("supportsEffort keeps effort for current models and drops it for the cheap tiers", () => {
  expect(supportsEffort("claude-opus-4-8")).toBe(true);
  expect(supportsEffort("claude-opus-5")).toBe(true);
  expect(supportsEffort("claude-sonnet-5")).toBe(true);

  expect(supportsEffort("claude-haiku-4-5")).toBe(false);
  expect(supportsEffort("claude-haiku-4-5-20251001")).toBe(false);
  expect(supportsEffort("claude-sonnet-4-5")).toBe(false);

  expect(supportsEffort("claude-something-6")).toBe(true);
});

test("supportsAdaptiveThinking mirrors the generation cut-off", () => {
  expect(supportsAdaptiveThinking("claude-sonnet-5")).toBe(true);
  expect(supportsAdaptiveThinking("claude-opus-4-8")).toBe(true);
  expect(supportsAdaptiveThinking("claude-haiku-4-5")).toBe(false);
  expect(supportsAdaptiveThinking("claude-3-5-sonnet-20241022")).toBe(false);
});

const apiError = (statusCode?: number): APICallError =>
  new APICallError({
    message: "provider said no",
    url: "https://api.anthropic.com/v1/messages",
    requestBodyValues: {},
    statusCode,
  });

test("classifyLlmError maps provider status codes onto the failure kinds", () => {
  expect(classifyLlmError(apiError(401))).toBe("auth");
  expect(classifyLlmError(apiError(403))).toBe("auth");
  expect(classifyLlmError(apiError(429))).toBe("rate_limit");
  expect(classifyLlmError(apiError(500))).toBe("overloaded");
  expect(classifyLlmError(apiError(529))).toBe("overloaded");
  expect(classifyLlmError(apiError(400))).toBe("invalid_request");
  expect(classifyLlmError(apiError(404))).toBe("invalid_request");
});

// The pre-fix mapping sent transport failures — where no response, and so no
// status, ever arrived — to `unknown`, hiding the one kind whose message tells
// the user to check with their administrator.
test("classifyLlmError reports a call that never got a response as a connection failure", () => {
  expect(classifyLlmError(apiError(undefined))).toBe("connection");
  expect(classifyLlmError(apiError(0))).toBe("connection");
  expect(failureMessage(classifyLlmError(apiError(undefined)))).toContain("couldn't be reached");
});

test("classifyLlmError falls back to unknown for anything that is not a provider error", () => {
  expect(classifyLlmError(new Error("kaboom"))).toBe("unknown");
  expect(classifyLlmError(new TypeError("fetch failed"))).toBe("unknown");
  expect(classifyLlmError("not an error")).toBe("unknown");
  expect(classifyLlmError(undefined)).toBe("unknown");
});

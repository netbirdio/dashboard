import { expect, test } from "bun:test";
import { type Config, loadConfig, resetConfigForTests } from "@/config.ts";

const base: Record<string, string> = {
  AUTH_AUDIENCE: "https://api.netbird.io",
  AUTH_AUTHORITY: "https://idp.test",
  ANTHROPIC_API_KEY: "sk-ant",
};

function load(overrides: Record<string, string> = {}): Config {
  resetConfigForTests();
  return loadConfig({ ...base, ...overrides });
}

test("parses a valid env with sensible defaults", () => {
  const c = load();
  expect(c.PORT).toBe(8787);
  expect(c.LLM_MAIN_MODEL).toBe("claude-sonnet-5");
  expect(c.LLM_FAST_MODEL).toBe("claude-haiku-4-5");
});

test("effort accepts the full ladder the current models support", () => {
  expect(load({ LLM_EFFORT_MAIN: "xhigh" }).LLM_EFFORT_MAIN).toBe("xhigh");
  expect(load({ LLM_EFFORT_MAIN: "max" }).LLM_EFFORT_MAIN).toBe("max");
  expect(() => load({ LLM_EFFORT_MAIN: "extreme" })).toThrow();
});

test("bool env coerces 'true'/'false' to a boolean", () => {
  expect(load({ GUARDRAIL_INPUT_CLASSIFIER: "true" }).GUARDRAIL_INPUT_CLASSIFIER).toBe(true);
});

// The defaults are what a deployment that never sets them runs on, so they are
// pinned: a limit no admin will hit, and a proxy that is not trusted.
test("rate limiting is on by default, with a burst and a sustained rate", () => {
  const c = load();
  expect(c.RATE_LIMIT_ENABLED).toBe(true);
  expect(c.RATE_LIMIT_CHAT_PER_MINUTE).toBe(30);
  expect(c.RATE_LIMIT_CHAT_BURST).toBe(15);
  expect(c.RATE_LIMIT_READYZ_PER_MINUTE).toBe(60);
  expect(c.RATE_LIMIT_READYZ_BURST).toBe(30);
  expect(c.TRUST_PROXY).toBe(false);
});

test("rate limits are coerced from the environment and must be positive", () => {
  expect(load({ RATE_LIMIT_CHAT_PER_MINUTE: "5" }).RATE_LIMIT_CHAT_PER_MINUTE).toBe(5);
  expect(load({ RATE_LIMIT_ENABLED: "false" }).RATE_LIMIT_ENABLED).toBe(false);
  expect(() => load({ RATE_LIMIT_CHAT_BURST: "0" })).toThrow();
  expect(() => load({ RATE_LIMIT_CHAT_BURST: "many" })).toThrow();
});

test("ALLOWED_ORIGINS is split into a trimmed list", () => {
  expect(load({ ALLOWED_ORIGINS: "https://a.io, https://b.io" }).ALLOWED_ORIGINS).toEqual([
    "https://a.io",
    "https://b.io",
  ]);
});

test("requires AUTH_AUTHORITY to be a URL", () => {
  resetConfigForTests();
  expect(() =>
    loadConfig({ AUTH_AUDIENCE: base.AUTH_AUDIENCE!, ANTHROPIC_API_KEY: "sk" }),
  ).toThrow();
  resetConfigForTests();
  expect(() => loadConfig({ ...base, AUTH_AUTHORITY: "not-a-url" })).toThrow();
});

test("requires ANTHROPIC_API_KEY", () => {
  resetConfigForTests();
  expect(() =>
    loadConfig({
      AUTH_AUDIENCE: base.AUTH_AUDIENCE!,
      AUTH_AUTHORITY: base.AUTH_AUTHORITY!,
    }),
  ).toThrow();
});

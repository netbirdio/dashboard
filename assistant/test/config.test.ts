import { test, expect } from "bun:test";
import { loadConfig, resetConfigForTests, type Config } from "@/config.ts";

const base: Record<string, string> = {
  AUTH_AUDIENCE: "https://api.netbird.io",
  AUTH_ISSUER: "https://idp.test/",
  AUTH_JWKS_URI: "https://idp.test/jwks",
  DATABASE_URL: "postgres://x",
  ANTHROPIC_API_KEY: "sk-ant",
};

function load(overrides: Record<string, string> = {}): Config {
  resetConfigForTests();
  return loadConfig({ ...base, ...overrides });
}

test("parses a valid env with sensible defaults", () => {
  const c = load();
  expect(c.PORT).toBe(8787);
  expect(c.METRICS_ENABLED).toBe(true);
  expect(c.LLM_MAIN_MODEL).toBe("claude-sonnet-5");
  expect(c.LLM_FAST_MODEL).toBe("claude-haiku-4-5");
  // Thinking is explicit, not left to a model-dependent default, and shares the
  // token budget with the answer — hence the headroom.
  expect(c.LLM_THINKING).toBe("adaptive");
  // The summary is streamed by default: without it the caller can only say
  // "Thinking" for the whole turn (see thinkingStatus in the dashboard).
  expect(c.LLM_THINKING_DISPLAY).toBe("summarized");
  expect(c.LLM_MAX_TOKENS).toBe(16000);
});

test("effort accepts the full ladder the current models support", () => {
  expect(load({ LLM_EFFORT_MAIN: "xhigh" }).LLM_EFFORT_MAIN).toBe("xhigh");
  expect(load({ LLM_EFFORT_MAIN: "max" }).LLM_EFFORT_MAIN).toBe("max");
  expect(() => load({ LLM_EFFORT_MAIN: "extreme" })).toThrow();
});

test("thinking can be turned off, but only to a known value", () => {
  expect(load({ LLM_THINKING: "off" }).LLM_THINKING).toBe("off");
  expect(() => load({ LLM_THINKING: "sometimes" })).toThrow();
});

test("bool env coerces 'true'/'false' to a boolean", () => {
  expect(load({ GUARDRAIL_INPUT_CLASSIFIER: "true" }).GUARDRAIL_INPUT_CLASSIFIER).toBe(true);
});

test("ALLOWED_ORIGINS is split into a trimmed list", () => {
  expect(load({ ALLOWED_ORIGINS: "https://a.io, https://b.io" }).ALLOWED_ORIGINS).toEqual([
    "https://a.io",
    "https://b.io",
  ]);
});

test("requires OIDC discovery or explicit issuer + jwks", () => {
  resetConfigForTests();
  expect(() =>
    loadConfig({ AUTH_AUDIENCE: base.AUTH_AUDIENCE!, DATABASE_URL: base.DATABASE_URL!, ANTHROPIC_API_KEY: "sk" }),
  ).toThrow();
});

test("requires ANTHROPIC_API_KEY", () => {
  resetConfigForTests();
  expect(() =>
    loadConfig({
      AUTH_AUDIENCE: base.AUTH_AUDIENCE!,
      AUTH_ISSUER: base.AUTH_ISSUER!,
      AUTH_JWKS_URI: base.AUTH_JWKS_URI!,
      DATABASE_URL: base.DATABASE_URL!,
    }),
  ).toThrow();
});

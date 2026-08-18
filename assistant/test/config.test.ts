import { test, expect } from "bun:test";
import { loadConfig, resetConfigForTests, type Config } from "@/config.ts";

const base: Record<string, string> = {
  AUTH_AUDIENCE: "https://api.netbird.io",
  AUTH_AUTHORITY: "https://idp.test",
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
});

test("effort accepts the full ladder the current models support", () => {
  expect(load({ LLM_EFFORT_MAIN: "xhigh" }).LLM_EFFORT_MAIN).toBe("xhigh");
  expect(load({ LLM_EFFORT_MAIN: "max" }).LLM_EFFORT_MAIN).toBe("max");
  expect(() => load({ LLM_EFFORT_MAIN: "extreme" })).toThrow();
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

test("requires AUTH_AUTHORITY to be a URL", () => {
  resetConfigForTests();
  expect(() =>
    loadConfig({ AUTH_AUDIENCE: base.AUTH_AUDIENCE!, DATABASE_URL: base.DATABASE_URL!, ANTHROPIC_API_KEY: "sk" }),
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
      DATABASE_URL: base.DATABASE_URL!,
    }),
  ).toThrow();
});

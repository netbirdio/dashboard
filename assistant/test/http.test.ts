import { test, expect, beforeEach } from "bun:test";
import { setEnv } from "./env.ts";
import { corsHeaders, cors, applyCors } from "@/http/cors.ts";
import { rateLimit, resetRateLimitForTests } from "@/middleware/rateLimit.ts";
import type { MutableCtx } from "@/http/compose.ts";

const ALLOWED = "https://dash.netbird.io";

function ctx(): MutableCtx {
  return {
    requestId: "r1",
    startedAt: 0,
    principal: { userId: "u1", accountId: "a1" },
  };
}

beforeEach(() => {
  setEnv({ ALLOWED_ORIGINS: ALLOWED, RATE_LIMIT_MAX: "2", RATE_LIMIT_WINDOW_SEC: "60" });
  resetRateLimitForTests();
});

test("corsHeaders echoes an allowed origin and blanks a disallowed one", () => {
  expect(corsHeaders(ALLOWED)["Access-Control-Allow-Origin"]).toBe(ALLOWED);
  expect(corsHeaders("https://evil.io")["Access-Control-Allow-Origin"]).toBe("");
});

test("cors middleware rejects a disallowed browser origin", () => {
  const blocked = cors(new Request("https://x/v1/chat", { headers: { Origin: "https://evil.io" } }), ctx());
  expect(blocked).toBeInstanceOf(Response);
  expect((blocked as Response).status).toBe(403);
  // No Origin header (non-browser / same-origin) passes through.
  expect(cors(new Request("https://x/v1/chat"), ctx())).toBeUndefined();
});

test("applyCors attaches the allow-origin header to a response", () => {
  const res = applyCors(
    new Request("https://x/v1/chat", { headers: { Origin: ALLOWED } }),
    new Response("ok"),
  );
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
});

test("rateLimit allows up to the max then returns 429 with Retry-After", async () => {
  expect(await rateLimit(new Request("https://x"), ctx())).toBeUndefined();
  expect(await rateLimit(new Request("https://x"), ctx())).toBeUndefined();
  const limited = await rateLimit(new Request("https://x"), ctx());
  expect(limited).toBeInstanceOf(Response);
  expect((limited as Response).status).toBe(429);
  expect((limited as Response).headers.get("Retry-After")).toBeTruthy();
});

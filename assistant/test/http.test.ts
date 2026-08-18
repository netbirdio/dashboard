import { test, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { setEnv } from "./env.ts";
import { createApp } from "@/http/app.ts";
import { loadConfig } from "@/config.ts";
import type { AppEnv } from "@/types.ts";
import { chatRateLimiter } from "@/http/limits.ts";

const ALLOWED = "https://dash.netbird.io";

beforeEach(() => {
  setEnv({ ALLOWED_ORIGINS: ALLOWED, RATE_LIMIT_MAX: "2", RATE_LIMIT_WINDOW_SEC: "60" });
});

test("preflight from an allowed origin gets the CORS headers", async () => {
  const app = createApp();
  const res = await app.request("/v1/chat", {
    method: "OPTIONS",
    headers: { Origin: ALLOWED, "Access-Control-Request-Method": "POST" },
  });
  expect(res.status).toBe(204);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
});

test("a disallowed browser origin is rejected with 403", async () => {
  const app = createApp();
  const res = await app.request("/v1/chat", { headers: { Origin: "https://evil.io" } });
  expect(res.status).toBe(403);

  const preflight = await app.request("/v1/chat", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.io", "Access-Control-Request-Method": "POST" },
  });
  expect(preflight.status).toBe(403);
});

test("an allowed origin keeps its CORS headers even on a 401", async () => {
  const app = createApp();
  const res = await app.request("/v1/chat", { headers: { Origin: ALLOWED } });
  expect(res.status).toBe(401);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
});

function limitedApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use((c, next) => {
    c.set("principal", { userId: "u1", accountId: "a1" });
    return next();
  });
  app.get("/x", chatRateLimiter(loadConfig()), (c) => c.text("ok"));
  return app;
}

test("rateLimit allows up to the max then returns 429 with Retry-After", async () => {
  const app = limitedApp();
  expect((await app.request("/x")).status).toBe(200);
  expect((await app.request("/x")).status).toBe(200);
  const limited = await app.request("/x");
  expect(limited.status).toBe(429);
  expect(limited.headers.get("Retry-After")).toBeTruthy();
});

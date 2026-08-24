import { afterAll, beforeEach, expect, test } from "bun:test";
import { Hono } from "hono";
import { resetConfigForTests } from "@/config.ts";
import { requestId } from "@/middleware.ts";
import {
  chatRateLimit,
  clientIp,
  readyzRateLimit,
  resetRateLimitForTests,
  TokenBuckets,
} from "@/ratelimit.ts";
import type { AppEnv } from "@/routes.ts";
import { setEnv } from "./env.ts";

beforeEach(() => {
  setEnv();
  resetRateLimitForTests();
});

afterAll(() => {
  setEnv();
  resetConfigForTests();
  resetRateLimitForTests();
});

// A hand-cranked clock: the bucket must be provable without sleeping on it.
function fakeClock(): { now: () => number; advance: (ms: number) => void } {
  let t = 1_000;
  return { now: () => t, advance: (ms) => void (t += ms) };
}

test("a bucket admits its burst, then refuses until it refills", () => {
  const clock = fakeClock();
  const buckets = new TokenBuckets({ capacity: 3, perMinute: 60 }, clock.now);

  for (let i = 0; i < 3; i++) expect(buckets.take("k").allowed).toBe(true);
  expect(buckets.take("k").allowed).toBe(false);

  // 60/minute is one token a second.
  clock.advance(1_000);
  expect(buckets.take("k").allowed).toBe(true);
  expect(buckets.take("k").allowed).toBe(false);
});

test("a refused request says how long to wait, rounded up to a whole second", () => {
  const clock = fakeClock();
  const buckets = new TokenBuckets({ capacity: 1, perMinute: 6 }, clock.now);

  expect(buckets.take("k").allowed).toBe(true);
  // A token every 10s, so an immediate retry waits the whole 10.
  expect(buckets.take("k")).toEqual({ allowed: false, retryAfterSec: 10 });

  clock.advance(9_500);
  expect(buckets.take("k")).toEqual({ allowed: false, retryAfterSec: 1 });
});

test("a bucket never refills past its capacity", () => {
  const clock = fakeClock();
  const buckets = new TokenBuckets({ capacity: 2, perMinute: 60 }, clock.now);

  expect(buckets.take("k").allowed).toBe(true);
  clock.advance(60 * 60_000);
  expect(buckets.take("k").allowed).toBe(true);
  expect(buckets.take("k").allowed).toBe(true);
  expect(buckets.take("k").allowed).toBe(false);
});

test("keys are independent", () => {
  const buckets = new TokenBuckets({ capacity: 1, perMinute: 60 }, fakeClock().now);

  expect(buckets.take("a").allowed).toBe(true);
  expect(buckets.take("b").allowed).toBe(true);
  expect(buckets.take("a").allowed).toBe(false);
});

// The chat limiter is mounted after auth, so its key is the verified principal.
function chatApp(principal: { userId: string; accountId: string }): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use("/v1/*", requestId, async (c, next) => {
    c.set("principal", principal);
    await next();
  }, chatRateLimit());
  app.get("/v1/chat", (c) => c.json({ ok: true }));
  return app;
}

test("a principal past its burst gets a 429 with Retry-After", async () => {
  setEnv({ RATE_LIMIT_CHAT_BURST: "2", RATE_LIMIT_CHAT_PER_MINUTE: "6" });
  const app = chatApp({ userId: "u1", accountId: "a1" });

  expect((await app.request("/v1/chat")).status).toBe(200);
  expect((await app.request("/v1/chat")).status).toBe(200);

  const limited = await app.request("/v1/chat");
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  // A code with no message renders as a blank error in the dashboard, which is
  // what an unregistered RejectionReason silently produces.
  const body = (await limited.json()) as { code: string; message: string; requestId: string };
  expect(body.code).toBe("rate_limited");
  expect(body.message.length).toBeGreaterThan(0);
  expect(body.requestId).toBeTruthy();
});

// One looping script must not throttle its colleagues in the same tenant.
test("each user in an account gets their own bucket", async () => {
  setEnv({ RATE_LIMIT_CHAT_BURST: "1", RATE_LIMIT_CHAT_PER_MINUTE: "6" });

  expect((await chatApp({ userId: "u1", accountId: "a1" }).request("/v1/chat")).status).toBe(200);
  expect((await chatApp({ userId: "u1", accountId: "a1" }).request("/v1/chat")).status).toBe(429);
  expect((await chatApp({ userId: "u2", accountId: "a1" }).request("/v1/chat")).status).toBe(200);
});

test("the limiter is a no-op while RATE_LIMIT_ENABLED is false", async () => {
  setEnv({ RATE_LIMIT_ENABLED: "false", RATE_LIMIT_CHAT_BURST: "1" });
  const app = chatApp({ userId: "u1", accountId: "a1" });

  for (let i = 0; i < 5; i++) expect((await app.request("/v1/chat")).status).toBe(200);
});

function readyzApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use("/readyz", requestId, readyzRateLimit());
  app.get("/readyz", (c) => c.json({ status: "ready" }));
  return app;
}

test("readyz is limited per client", async () => {
  setEnv({ RATE_LIMIT_READYZ_BURST: "2", RATE_LIMIT_READYZ_PER_MINUTE: "6" });
  const app = readyzApp();

  expect((await app.request("/readyz")).status).toBe(200);
  expect((await app.request("/readyz")).status).toBe(200);
  expect((await app.request("/readyz")).status).toBe(429);
});

// The header is the only spoofable input in the whole limiter, so it is read
// only where an operator has said a proxy sets it.
test("X-Forwarded-For is ignored unless TRUST_PROXY is on", async () => {
  const app = new Hono<AppEnv>();
  app.get("/ip", (c) => c.text(clientIp(c)));

  const withHeader = () =>
    app.request("/ip", { headers: { "X-Forwarded-For": "9.9.9.9, 10.0.0.1" } });

  setEnv();
  expect(await (await withHeader()).text()).toBe("unknown");

  setEnv({ TRUST_PROXY: "true" });
  // The right-most entry is the one our own proxy observed.
  expect(await (await withHeader()).text()).toBe("10.0.0.1");
});

test("the peer address is used when the Bun server is on the context", async () => {
  const app = new Hono<AppEnv>();
  app.get("/ip", (c) => c.text(clientIp(c)));

  const res = await app.request("/ip", {}, {
    requestIP: () => ({ address: "203.0.113.7" }),
  });
  expect(await res.text()).toBe("203.0.113.7");
});

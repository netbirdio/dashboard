import { test, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { setEnv } from "./env.ts";
import type { AppEnv } from "@/types.ts";
import { clientAddress, PROBE_LIMIT, probeRateLimiter } from "@/http/limits.ts";

// TRUST_PROXY_HEADER=true lets each test pick its client address via
// X-Forwarded-For; without a real socket that is the only key source.
function probeApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.get("/readyz", probeRateLimiter(), (c) => c.text("ok"));
  app.get("/addr", (c) => c.text(clientAddress(c)));
  return app;
}

const from = (address: string) => ({ headers: { "x-forwarded-for": address } });

beforeEach(() => {
  setEnv({ TRUST_PROXY_HEADER: "true" });
});

test("allows requests up to the ceiling, then 429s with Retry-After", async () => {
  const app = probeApp();
  for (let i = 0; i < PROBE_LIMIT; i++) {
    expect((await app.request("/readyz", from("1.2.3.4"))).status).toBe(200);
  }
  const res = await app.request("/readyz", from("1.2.3.4"));
  expect(res.status).toBe(429);
  expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
});

test("buckets are per address — one flooder doesn't refuse the load balancer", async () => {
  const app = probeApp();
  for (let i = 0; i <= PROBE_LIMIT; i++) await app.request("/readyz", from("9.9.9.9"));
  expect((await app.request("/readyz", from("9.9.9.9"))).status).toBe(429);

  expect((await app.request("/readyz", from("10.0.0.1"))).status).toBe(200);
});

test("ignores a forged X-Forwarded-For unless TRUST_PROXY_HEADER is set", async () => {
  setEnv({ TRUST_PROXY_HEADER: "false" });
  const app = probeApp();
  // No trusted header and no socket in tests: falls back to the shared key.
  expect(await (await app.request("/addr", from("6.6.6.6"))).text()).toBe("unknown");
});

test("honours X-Forwarded-For once trusted, taking the client hop", async () => {
  const app = probeApp();
  const res = await app.request("/addr", from("6.6.6.6, 10.0.0.7"));
  expect(await res.text()).toBe("6.6.6.6");
});

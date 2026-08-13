import { test, expect, beforeEach } from "bun:test";
import {
  checkProbeLimit,
  clientAddress,
  resetProbeLimitForTests,
  sweepProbeBuckets,
} from "@/middleware/probeRateLimit.ts";
import type { RouteServer } from "@/telemetry/metrics.ts";
import { setEnv } from "./env.ts";

/** Minimal stand-in for Bun's Server — only requestIP is ever reached. */
function serverAt(address: string | null): RouteServer {
  return { requestIP: () => (address ? { address, port: 1, family: "IPv4" } : null) } as unknown as RouteServer;
}

const probe = () => new Request("https://x/readyz");

beforeEach(() => {
  setEnv({ PROBE_RATE_LIMIT_MAX: "3", PROBE_RATE_LIMIT_WINDOW_SEC: "10" });
  resetProbeLimitForTests();
});

test("allows requests up to the ceiling, then 429s with Retry-After", () => {
  for (let i = 0; i < 3; i++) expect(checkProbeLimit("1.2.3.4")).toBeUndefined();

  const res = checkProbeLimit("1.2.3.4");
  expect(res?.status).toBe(429);
  expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
});

test("buckets are per address — one flooder doesn't refuse the load balancer", () => {
  for (let i = 0; i < 4; i++) checkProbeLimit("9.9.9.9");
  expect(checkProbeLimit("9.9.9.9")?.status).toBe(429);
  // The probe source is untouched, which is the point: refusing it would make a
  // healthy instance look down.
  expect(checkProbeLimit("10.0.0.1")).toBeUndefined();
});

test("the window lapsing lets the address through again", () => {
  setEnv({ PROBE_RATE_LIMIT_MAX: "1", PROBE_RATE_LIMIT_WINDOW_SEC: "1" });
  resetProbeLimitForTests();

  expect(checkProbeLimit("1.2.3.4")).toBeUndefined();
  expect(checkProbeLimit("1.2.3.4")?.status).toBe(429);

  const lapsed = Date.now() + 1_100;
  sweepProbeBuckets(lapsed);
  expect(checkProbeLimit("1.2.3.4")).toBeUndefined();
});

test("sweep drops only lapsed buckets", () => {
  checkProbeLimit("1.1.1.1");
  sweepProbeBuckets(Date.now());
  // Still within its window, so the count carried over and the ceiling holds.
  for (let i = 0; i < 2; i++) checkProbeLimit("1.1.1.1");
  expect(checkProbeLimit("1.1.1.1")?.status).toBe(429);
});

test("keys off the socket address, ignoring a forged X-Forwarded-For by default", () => {
  const req = new Request("https://x/readyz", { headers: { "x-forwarded-for": "6.6.6.6" } });
  expect(clientAddress(req, serverAt("203.0.113.9"))).toBe("203.0.113.9");
});

test("honours X-Forwarded-For once TRUST_PROXY_HEADER is set, taking the client hop", () => {
  setEnv({ TRUST_PROXY_HEADER: "true" });
  const req = new Request("https://x/readyz", {
    headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.7" },
  });
  expect(clientAddress(req, serverAt("10.0.0.7"))).toBe("6.6.6.6");
});

test("falls back to a shared key when the address is unavailable", () => {
  expect(clientAddress(probe(), serverAt(null))).toBe("unknown");
  expect(clientAddress(probe(), undefined)).toBe("unknown");
});

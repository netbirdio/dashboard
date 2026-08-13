/**
 * Burst control for the unauthenticated probes. The chat limiter keys off the
 * validated JWT, which a probe doesn't carry, so this keys off the client address
 * instead. In-memory token bucket, same trade-off as `rateLimit`: fine for a
 * single instance, swap in a shared store when we scale out.
 */
import { loadConfig } from "@/config.ts";
import type { RouteServer } from "@/telemetry/metrics.ts";

const buckets = new Map<string, { count: number; resetAt: number }>();
const SWEEP_THRESHOLD = 1000;

/**
 * Socket address by default. `X-Forwarded-For` is only consulted behind an
 * explicit TRUST_PROXY_HEADER, because it is caller-supplied: trusting it while
 * directly exposed would let a flood rotate the header to get a fresh bucket per
 * request. The left-most entry is the original client; the rest are proxy hops.
 */
export function clientAddress(req: Request, server?: RouteServer): string {
  if (loadConfig().TRUST_PROXY_HEADER) {
    const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  // Falling back to a shared key means an unattributable request is limited
  // alongside every other one — stricter than letting it through unmetered.
  return server?.requestIP(req)?.address ?? "unknown";
}

/** 429 once an address exceeds the window's budget, otherwise undefined. */
export function checkProbeLimit(address: string): Response | undefined {
  const cfg = loadConfig();
  const now = Date.now();
  const b = buckets.get(address);

  if (!b || now >= b.resetAt) {
    // Traffic from many addresses mints a bucket each; drop the lapsed ones before
    // the map can grow without bound. Amortised — only on a new address, and only
    // once the map is big enough for the scan to be worth it.
    if (buckets.size >= SWEEP_THRESHOLD) sweepProbeBuckets(now);
    buckets.set(address, { count: 1, resetAt: now + cfg.PROBE_RATE_LIMIT_WINDOW_SEC * 1000 });
    return undefined;
  }
  if (b.count >= cfg.PROBE_RATE_LIMIT_MAX) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } },
    );
  }
  b.count++;
  return undefined;
}

/** Drop every bucket whose window has lapsed. */
export function sweepProbeBuckets(now = Date.now()): void {
  for (const [key, b] of buckets) if (now >= b.resetAt) buckets.delete(key);
}

/** Test-only: clear the probe buckets between cases. */
export function resetProbeLimitForTests(): void {
  buckets.clear();
}

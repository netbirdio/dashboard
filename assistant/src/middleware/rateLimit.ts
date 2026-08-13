/**
 * Rate limit — burst control keyed off the validated JWT, short-circuiting before
 * the model call. In-memory token bucket, fine for a single instance; a distributed
 * store can slot in behind this same middleware when we scale out.
 */
import { loadConfig } from "@/config.ts";
import type { Middleware } from "@/http/compose.ts";

const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit: Middleware = (_req, ctx) => {
  const cfg = loadConfig();
  const { accountId, userId } = ctx.principal!;
  const key = `${accountId}:${userId}`;
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + cfg.RATE_LIMIT_WINDOW_SEC * 1000 });
    return undefined;
  }
  if (b.count >= cfg.RATE_LIMIT_MAX) {
    ctx.rejection = "rate_limited";
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } },
    );
  }
  b.count++;
  return undefined;
};

/** Test-only: clear the rate-limit buckets between cases. */
export function resetRateLimitForTests(): void {
  buckets.clear();
}

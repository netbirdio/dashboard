import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/bun";
import { rateLimiter } from "hono-rate-limiter";
import type { Config } from "@/config.ts";
import { loadConfig } from "@/config.ts";
import { getUsage } from "@/db/index.ts";
import type { AppEnv } from "@/types.ts";
import { errorBody, errorResponse } from "@/http/respond.ts";

// Built via c.json so the headers the limiter set (Retry-After, RateLimit-*)
// survive; a raw Response would discard them.
const limited: MiddlewareHandler<AppEnv> = (c) => {
  c.set("rejection", "rate_limited");
  return Promise.resolve(c.json(errorBody("rate_limited"), 429));
};

export function chatRateLimiter(cfg: Config): MiddlewareHandler<AppEnv> {
  return rateLimiter<AppEnv>({
    windowMs: cfg.RATE_LIMIT_WINDOW_SEC * 1000,
    limit: cfg.RATE_LIMIT_MAX,
    keyGenerator: (c) => {
      const { accountId, userId } = c.get("principal");
      return `${accountId}:${userId}`;
    },
    handler: limited,
  });
}

export const PROBE_LIMIT = 100;
const PROBE_WINDOW_MS = 10_000;

export function probeRateLimiter(): MiddlewareHandler<AppEnv> {
  return rateLimiter<AppEnv>({
    windowMs: PROBE_WINDOW_MS,
    limit: PROBE_LIMIT,
    keyGenerator: clientAddress,
    handler: limited,
  });
}

export function clientAddress(c: Context<AppEnv>): string {
  if (loadConfig().TRUST_PROXY_HEADER) {
    const fwd = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const usageLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cfg = loadConfig();
  const { accountId, userId } = c.get("principal");
  const used = await getUsage({ accountId, userId });

  const over =
    used.userDaily >= cfg.LIMIT_USER_DAILY_TOKENS ||
    used.userMonthly >= cfg.LIMIT_USER_MONTHLY_TOKENS ||
    used.accountDaily >= cfg.LIMIT_ACCOUNT_DAILY_TOKENS ||
    used.accountMonthly >= cfg.LIMIT_ACCOUNT_MONTHLY_TOKENS;

  if (over) {
    c.set("rejection", "usage_limit");
    return errorResponse("usage_limit", 402);
  }
  await next();
};

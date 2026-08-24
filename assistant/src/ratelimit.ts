/**
 * Request rate limiting: a token bucket per caller, in memory.
 *
 * A single valid token can otherwise issue unbounded chat turns, and every one
 * of them is a multi-step model call plus a suggestions call — real money, and
 * no ceiling on it.
 *
 * The state is deliberately in-process: this service has no database, and
 * adding one to hold counters would be a much larger commitment than the
 * problem needs. The consequence has to be written down rather than discovered
 * later: **the limit is per container**, so N replicas admit up to N times the
 * configured rate, and a rolling deploy resets every bucket. That is an
 * acceptable ceiling for stopping a runaway script; it is not a quota system.
 * A real per-tenant quota needs shared, durable state.
 */
import type { Context, MiddlewareHandler } from "hono";
import { LRUCache } from "lru-cache";
import { loadConfig } from "@/config.ts";
import { errorResponse } from "@/errors.ts";
import type { AppEnv } from "@/routes.ts";

export interface BucketLimit {
  // Requests admitted back-to-back from a cold bucket.
  capacity: number;
  // Sustained rate the bucket refills at.
  perMinute: number;
}

export interface Decision {
  allowed: boolean;
  // Whole seconds until the next token, for the Retry-After header.
  retryAfterSec: number;
}

// Injectable so tests can step time instead of sleeping on it.
export type Clock = () => number;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/*
  Bounded memory: one bucket per key, evicted by idleness and then by count.

  The TTL must stay comfortably above the time a bucket takes to refill from
  empty (capacity / perMinute minutes) — an entry dropped earlier than that
  would come back full and hand out free tokens.
*/
const MAX_KEYS = 20_000;
const IDLE_TTL_MS = 10 * 60_000;

export class TokenBuckets {
  private readonly buckets: LRUCache<string, Bucket>;

  constructor(
    private readonly limit: BucketLimit,
    private readonly now: Clock = Date.now,
  ) {
    this.buckets = new LRUCache<string, Bucket>({ max: MAX_KEYS, ttl: IDLE_TTL_MS });
  }

  take(key: string): Decision {
    const now = this.now();
    const perMs = this.limit.perMinute / 60_000;
    const bucket = this.buckets.get(key);
    const tokens = bucket
      ? Math.min(this.limit.capacity, bucket.tokens + (now - bucket.updatedAt) * perMs)
      : this.limit.capacity;

    if (tokens < 1) {
      this.buckets.set(key, { tokens, updatedAt: now });
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((1 - tokens) / perMs / 1000)) };
    }
    this.buckets.set(key, { tokens: tokens - 1, updatedAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  clear(): void {
    this.buckets.clear();
  }
}

// Named so that repeated createApp() calls in tests share one set of buckets,
// the way one process shares them in production.
const stores = new Map<string, TokenBuckets>();

export function resetRateLimitForTests(): void {
  stores.clear();
}

// Built on first request, not at mount time: config is what supplies the
// limits, and a test that re-reads it must be able to change them.
function store(name: string, limit: () => BucketLimit): TokenBuckets {
  let found = stores.get(name);
  if (!found) {
    found = new TokenBuckets(limit());
    stores.set(name, found);
  }
  return found;
}

type KeyFor = (c: Context<AppEnv>) => string;

export function rateLimit(
  name: string,
  limit: () => BucketLimit,
  keyFor: KeyFor,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!loadConfig().RATE_LIMIT_ENABLED) {
      await next();
      return;
    }
    const decision = store(name, limit).take(keyFor(c));
    if (!decision.allowed) {
      const res = errorResponse("rate_limited", 429, { requestId: c.get("requestId") });
      res.headers.set("Retry-After", String(decision.retryAfterSec));
      return res;
    }
    await next();
  };
}

/*
  The bucket is the user, not the account. A per-account bucket would let one
  looping script throttle every colleague in the same tenant, which turns a
  cost control into an in-tenant denial of service. Cost fairness across a
  tenant is a quota question, and a quota needs durable state this service does
  not have. The account is still part of the key so that ids from different
  tenants can never share a bucket.
*/
function principalKey(c: Context<AppEnv>): string {
  const { accountId, userId } = c.get("principal");
  return `${accountId}:${userId}`;
}

// Mounted after `auth`, so the key is the verified identity and an unverified
// caller never reaches a bucket at all.
export function chatRateLimit(): MiddlewareHandler<AppEnv> {
  return rateLimit(
    "chat",
    () => {
      const cfg = loadConfig();
      return { capacity: cfg.RATE_LIMIT_CHAT_BURST, perMinute: cfg.RATE_LIMIT_CHAT_PER_MINUTE };
    },
    principalKey,
  );
}

export function readyzRateLimit(): MiddlewareHandler<AppEnv> {
  return rateLimit(
    "readyz",
    () => {
      const cfg = loadConfig();
      return { capacity: cfg.RATE_LIMIT_READYZ_BURST, perMinute: cfg.RATE_LIMIT_READYZ_PER_MINUTE };
    },
    clientIp,
  );
}

/*
  The connection's peer address, which the internet cannot spoof, in preference
  to X-Forwarded-For, which it can: the header is only read when TRUST_PROXY
  says a proxy we control sets it. Its right-most entry is the address that
  proxy itself observed — everything left of it was supplied by the caller.

  Callers with no readable address (a non-Bun host, or `app.request()` in the
  tests) share one bucket rather than escaping the limit.
*/
export function clientIp(c: Context<AppEnv>): string {
  if (loadConfig().TRUST_PROXY) {
    const forwarded = c.req.header("X-Forwarded-For")?.split(",");
    const nearest = forwarded?.at(-1)?.trim();
    if (nearest) return nearest;
  }
  const server = c.env as AppEnv["Bindings"] | undefined;
  if (typeof server?.requestIP !== "function") return "unknown";
  return server.requestIP(c.req.raw)?.address ?? "unknown";
}

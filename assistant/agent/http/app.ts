import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { auth, authReady } from "@/http/auth.ts";
import { chat } from "@/agent.ts";
import { loadConfig } from "@/config.ts";
import { dbReady } from "@/db/index.ts";
import type { AppEnv, MutableCtx } from "@/types.ts";
import { errorResponse } from "@/http/respond.ts";
import { chatRateLimiter, probeRateLimiter, usageLimit } from "@/http/limits.ts";
import { countRejection, httpInFlight, observeHttp, reasonFromStatus } from "@/instrumentation/metrics.ts";

// Outermost middleware: request id, HTTP metrics, last-resort error handling,
// and rejection counting. Applied per known route so 404 spam can't blow up
// the route label cardinality.
export const track: MiddlewareHandler<AppEnv> = async (c, next) => {
  const route = c.req.path;
  const start = performance.now();
  c.set("requestId", crypto.randomUUID());
  httpInFlight.inc({ route });
  try {
    await next();
  } catch (err) {
    console.error(`[${c.get("requestId")}] unhandled error:`, (err as Error)?.message ?? err);
    c.set("rejection", "internal_error");
    c.res = errorResponse("internal_error", 500, { requestId: c.get("requestId") });
  } finally {
    httpInFlight.dec({ route });
  }
  observeHttp(route, c.req.method, c.res.status, (performance.now() - start) / 1000);
  if (c.res.status >= 400) {
    countRejection(route, c.get("rejection") ?? reasonFromStatus(c.res.status));
  }
};

// Reject browser requests from unknown origins outright; hono/cors only
// withholds the allow headers, which still lets non-preflighted requests run.
const originGate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && !loadConfig().ALLOWED_ORIGINS.includes(origin)) {
    c.set("rejection", "cors");
    return c.text("Origin not allowed", 403);
  }
  await next();
};

export function createApp(): Hono<AppEnv> {
  const cfg = loadConfig();
  const app = new Hono<AppEnv>();

  const corsMw = cors({
    origin: (origin) => (cfg.ALLOWED_ORIGINS.includes(origin) ? origin : ""),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  });

  app.use("/healthz", track);
  app.use("/readyz", track, corsMw, probeRateLimiter());
  app.use("/v1/*", track, originGate, corsMw, auth);

  app.get("/healthz", (c) => c.json({ status: "ok" }));

  app.get("/readyz", async (c) => {
    const db = await dbReady();
    const jwks = authReady();
    const ready = db && jwks;
    return c.json(
      { status: ready ? "ready" : "not_ready", checks: { db, jwks } },
      ready ? 200 : 503,
    );
  });

  app.post("/v1/chat", chatRateLimiter(cfg), usageLimit, async (c) => {
    const ctx: MutableCtx = {
      requestId: c.get("requestId"),
      principal: c.get("principal"),
    };
    const res = await chat(c.req.raw, ctx);
    if (ctx.rejection) c.set("rejection", ctx.rejection);
    return res;
  });

  return app;
}

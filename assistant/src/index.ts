/**
 * Entrypoint — native Bun.serve with a route table + middleware chain.
 * Stateless and deployment-ready: env config, /healthz + /readyz probes, and a
 * SIGTERM drain so rolling deploys don't cut in-flight SSE streams.
 */
import { loadConfig } from "@/config.ts";
import { initAuth } from "@/jwks.ts";
import { auth } from "@/middleware/auth.ts";
import { compose } from "@/http/compose.ts";
import { cors, preflight, applyCors } from "@/http/cors.ts";
import { rateLimit } from "@/middleware/rateLimit.ts";
import { checkProbeLimit, clientAddress } from "@/middleware/probeRateLimit.ts";
import { usageLimit } from "@/middleware/usageLimit.ts";
import { chat } from "@/routes/chat.ts";
import { models } from "@/routes/models.ts";
import { suggestions } from "@/routes/suggestions.ts";
import { healthz, readyz } from "@/routes/health.ts";
import { setBuildInfo, withMetrics, metricsHandler, countRejection } from "@/telemetry/metrics.ts";
import { installRollupGauges } from "@/telemetry/dbGauges.ts";
import { drainTelemetry } from "@/telemetry/store.ts";
import { migrate } from "@/db/migrate.ts";

const cfg = loadConfig();
setBuildInfo(cfg.SERVICE_VERSION, cfg.NODE_ENV);
// Today's/this month's totals are read from Postgres on scrape (see dbGauges.ts).
installRollupGauges();

// Apply pending migrations before serving (no-op when up to date; advisory-locked
// so concurrent instances don't race). Crashes the process if the DB is unreachable.
await migrate();

// Resolve issuer + JWKS at boot so the first request isn't slowed; on failure we
// stay up but /readyz reports not-ready until JWKS resolves.
await initAuth().catch((err) => {
  console.error("auth init failed:", err.message);
});

const composed = compose("/v1/chat", [cors, auth, rateLimit, usageLimit], chat);
const chatHandler = withMetrics("/v1/chat", async (req: Request) =>
  applyCors(req, await composed(req)),
);

// Authenticated, but no rate/usage limits — neither payload is account-specific.
const modelsComposed = compose("/v1/models", [cors, auth], models);
const modelsHandler = withMetrics("/v1/models", async (req: Request) =>
  applyCors(req, await modelsComposed(req)),
);
const suggestionsComposed = compose("/v1/suggestions", [cors, auth], suggestions);
const suggestionsHandler = withMetrics("/v1/suggestions", async (req: Request) =>
  applyCors(req, await suggestionsComposed(req)),
);

const server = Bun.serve({
  port: cfg.PORT,
  // Reject oversized bodies before buffering them (defence-in-depth with the
  // per-route byte check in the chat guardrail).
  maxRequestBodySize: cfg.MAX_REQUEST_BYTES,
  // Bun defaults to 10s, which cuts SSE streams whose first event is slow to
  // arrive. See SERVER_IDLE_TIMEOUT_SEC in config.ts.
  idleTimeout: cfg.SERVER_IDLE_TIMEOUT_SEC,
  routes: {
    "/healthz": { GET: withMetrics("/healthz", healthz) },
    // CORS-enabled (unauthenticated) because the dashboard probes it before
    // rendering the assistant launcher — without the headers the browser
    // refuses to read the response and a healthy server looks down.
    // Rate-limited per client address: unlike /v1/*, there is no principal to key
    // on, and the check runs before readyz() so a flood can't reach the DB probe.
    "/readyz": {
      OPTIONS: preflight,
      GET: withMetrics("/readyz", async (req: Request, server) => {
        const limited = checkProbeLimit(clientAddress(req, server));
        if (limited) {
          countRejection("/readyz", "rate_limited");
          return applyCors(req, limited);
        }
        return applyCors(req, await readyz());
      }),
    },
    "/v1/chat": {
      OPTIONS: preflight,
      POST: chatHandler,
    },
    "/v1/models": {
      OPTIONS: preflight,
      GET: modelsHandler,
    },
    "/v1/suggestions": {
      OPTIONS: preflight,
      GET: suggestionsHandler,
    },
  },
  fetch() {
    return new Response("not found", { status: 404 });
  },
});

// Metrics get their own listener so they never share a port with the public API:
// the deployment publishes PORT and not METRICS_PORT, which keeps /metrics
// reachable by the scraper on the private network and by nothing else.
const metricsServer = cfg.METRICS_ENABLED
  ? Bun.serve({
      port: cfg.METRICS_PORT,
      hostname: cfg.METRICS_HOST,
      routes: { "/metrics": { GET: metricsHandler } },
      fetch() {
        return new Response("not found", { status: 404 });
      },
    })
  : null;

console.log(`netbird-assistant listening on :${server.port} (${cfg.NODE_ENV})`);
if (metricsServer) {
  console.log(`metrics on ${cfg.METRICS_HOST}:${metricsServer.port}/metrics (not published)`);
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, draining…`);
  await server.stop(false); // keep in-flight streams; stop accepting new ones
  await metricsServer?.stop(true);
  await drainTelemetry();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

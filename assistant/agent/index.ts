import { createApp } from "@/http/app.ts";
import { initAuth } from "@/http/auth.ts";
import { loadConfig } from "@/config.ts";
import { drainTelemetry, installRollupGauges } from "@/db/index.ts";
import { MAX_REQUEST_BYTES } from "@/guardrails.ts";
import { migrate } from "@/db/migrate.ts";
import {
  METRICS_PUSH_INTERVAL_MS,
  metricsHandler,
  setBuildInfo,
  startMetricsPush,
} from "@/instrumentation/metrics.ts";

const cfg = loadConfig();
setBuildInfo(cfg.SERVICE_VERSION, cfg.NODE_ENV);

installRollupGauges();

await migrate();

await initAuth().catch((err) => {
  console.error("auth init failed:", err.message);
});

const app = createApp();

const server = Bun.serve({
  port: cfg.PORT,

  maxRequestBodySize: MAX_REQUEST_BYTES,

  // Above Bun's 4-minute cap a streamed turn would be cut off mid-answer.
  idleTimeout: 240,
  fetch: (req, srv) => app.fetch(req, srv),
});

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

const metricsPush = startMetricsPush();

console.log(`netbird-assistant listening on :${server.port} (${cfg.NODE_ENV})`);
if (metricsServer) {
  console.log(`metrics on ${cfg.METRICS_HOST}:${metricsServer.port}/metrics (not published)`);
}
if (metricsPush) {
  console.log(`metrics push to ${cfg.METRICS_PUSH_URL} every ${METRICS_PUSH_INTERVAL_MS / 1000}s`);
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, draining…`);
  if (metricsPush) clearInterval(metricsPush);
  await server.stop(false);
  await metricsServer?.stop(true);
  await drainTelemetry();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

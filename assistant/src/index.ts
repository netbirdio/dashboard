import { MAX_REQUEST_BYTES } from "@/agent/request.ts";
import { loadConfig } from "@/config.ts";
import { initAuth } from "@/middleware.ts";
import { createApp } from "@/routes.ts";

const cfg = loadConfig();

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

console.log(`netbird-assistant listening on :${server.port} (${cfg.NODE_ENV})`);

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, draining…`);
  await server.stop(false);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

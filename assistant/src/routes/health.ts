/**
 * Health & readiness probes for the load balancer.
 *  /healthz : liveness — always 200 if we can respond.
 *  /readyz  : readiness — JWKS initialised AND Postgres reachable.
 */
import { authReady } from "@/jwks.ts";
import { dbReady } from "@/telemetry/store.ts";

export function healthz(): Response {
  return Response.json({ status: "ok" });
}

export async function readyz(): Promise<Response> {
  const [db, jwks] = [await dbReady(), authReady()];
  const ready = db && jwks;
  return Response.json(
    { status: ready ? "ready" : "not_ready", checks: { db, jwks } },
    { status: ready ? 200 : 503 },
  );
}

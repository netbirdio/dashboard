import type { Handler } from "hono";
import { Hono } from "hono";
import { chat } from "@/agent/chat.ts";
import { validateChatRequest } from "@/agent/request.ts";
import { errorResponse } from "@/errors.ts";
import {
  auth,
  authReady,
  corsMiddleware,
  errorBoundary,
  originGate,
  type Principal,
  requestId,
} from "@/middleware.ts";
import { chatRateLimit, readyzRateLimit } from "@/ratelimit.ts";

// Hono environment: the per-request variables shared between middleware and
// handlers, plus the one thing read off the server the fetch handler was called
// with — the connection's peer address, see clientIp() in ratelimit.ts.
export type AppEnv = {
  Bindings: { requestIP: (req: Request) => { address: string } | null };
  Variables: {
    requestId: string;
    principal: Principal;
  };
};

// Liveness only: the process is up. Never touches a dependency, so a database
// blip can't get the container killed.
const healthz: Handler<AppEnv> = (c) => c.json({ status: "ok" });

// Readiness: the JWKS must be loaded before a token can be verified.
const readyz: Handler<AppEnv> = (c) => {
  const jwks = authReady();
  return c.json({ status: jwks ? "ready" : "not_ready", checks: { jwks } }, jwks ? 200 : 503);
};

// The HTTP boundary of a turn: everything about the body — reading it, its
// size, its shape — is settled here, so chat() only ever sees a valid request.
const chatTurn: Handler<AppEnv> = async (c) => {
  const id = c.get("requestId");
  const validation = await validateChatRequest(c.req.raw);
  if (!validation.ok) {
    return errorResponse(validation.reason, validation.status, {
      detail: validation.error,
      requestId: id,
    });
  }
  return chat(validation.value, {
    requestId: id,
    principal: c.get("principal"),
    signal: c.req.raw.signal,
  });
};

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const cors = corsMiddleware();

  app.onError(errorBoundary);

  app.use("/healthz", requestId);
  app.use("/readyz", requestId, cors, readyzRateLimit());
  // The chat limiter sits after auth so its bucket is the verified principal
  // rather than anything the caller can choose.
  app.use("/v1/*", requestId, originGate, cors, auth, chatRateLimit());

  app.get("/healthz", healthz);
  app.get("/readyz", readyz);
  app.post("/v1/chat", chatTurn);

  return app;
}

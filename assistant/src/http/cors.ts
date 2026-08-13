/**
 * CORS — locked to ALLOWED_ORIGINS. Bearer-token auth (no cookies) means no
 * credentialed CORS, so we never send Allow-Credentials.
 */
import { loadConfig } from "@/config.ts";
import type { Middleware } from "@/http/compose.ts";

/** CORS headers echoing the request origin only when it is allowlisted. */
export function corsHeaders(origin: string | null): Record<string, string> {
  const { ALLOWED_ORIGINS } = loadConfig();
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("Origin")) });
}

/** Attach CORS headers to a response so the browser can read it. */
export function applyCors(req: Request, res: Response): Response {
  for (const [k, v] of Object.entries(corsHeaders(req.headers.get("Origin")))) {
    if (v) res.headers.set(k, v);
  }
  return res;
}

/** Reject a browser request from a disallowed origin before any work happens. */
export const cors: Middleware = (req, ctx) => {
  const origin = req.headers.get("Origin");
  const { ALLOWED_ORIGINS } = loadConfig();
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    ctx.rejection = "cors";
    return new Response("Origin not allowed", { status: 403 });
  }
  return undefined;
};

/**
 * Auth middleware — verify the Bearer token, attach the principal to ctx.
 * Returns a generic 401 on any failure so we never signal *why* to a caller.
 */
import { verifyToken } from "@/jwks.ts";
import type { Middleware } from "@/http/compose.ts";

export const auth: Middleware = async (req, ctx) => {
  const [scheme, token] = (req.headers.get("Authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    ctx.rejection = "unauthorized";
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    ctx.principal = await verifyToken(token);
  } catch {
    ctx.rejection = "unauthorized";
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return undefined;
};

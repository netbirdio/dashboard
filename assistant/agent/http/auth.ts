import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { loadConfig } from "@/config.ts";
import type { AppEnv } from "@/types.ts";
import { errorResponse } from "@/http/respond.ts";
import type { Principal } from "@/types.ts";

interface AuthEndpoints {
  issuer: string;
  jwksUri: string;
}

const CLOCK_TOLERANCE_SEC = 5;

let jwks: JWTVerifyGetKey | null = null;
let endpoints: AuthEndpoints | null = null;

function accountClaimKey(audience: string): string {
  return audience.endsWith("/") ? `${audience}wt_account_id` : `${audience}/wt_account_id`;
}

// Standard OIDC discovery, the same way the dashboard resolves its authority.
export function discoveryUrl(authority: string): string {
  return `${authority.replace(/\/+$/, "")}/.well-known/openid-configuration`;
}

export async function initAuth(): Promise<AuthEndpoints> {
  if (endpoints) return endpoints;
  const cfg = loadConfig();

  const res = await fetch(discoveryUrl(cfg.AUTH_AUTHORITY));
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  const doc = (await res.json()) as { issuer?: string; jwks_uri?: string };
  if (!doc.issuer || !doc.jwks_uri) throw new Error("OIDC discovery doc missing issuer/jwks_uri");
  endpoints = { issuer: doc.issuer, jwksUri: doc.jwks_uri };

  jwks = createRemoteJWKSet(new URL(endpoints.jwksUri));
  return endpoints;
}

export async function verifyToken(token: string): Promise<Principal> {
  const cfg = loadConfig();

  if (token.startsWith("nbp_")) {
    throw new Error("personal access tokens are not accepted");
  }
  if (!jwks) await initAuth();

  const { payload } = await jwtVerify(token, jwks!, {
    issuer: endpoints!.issuer,
    audience: cfg.AUTH_AUDIENCE,
    clockTolerance: CLOCK_TOLERANCE_SEC,
  });

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat === "number" && payload.iat > now + CLOCK_TOLERANCE_SEC) {
    throw new Error("token issued in the future");
  }

  const userId = payload.sub;
  if (typeof userId !== "string" || !userId) {
    throw new Error("user id claim missing");
  }

  const accountId = payload[accountClaimKey(cfg.AUTH_AUDIENCE)];
  if (typeof accountId !== "string" || !accountId) {
    throw new Error("account id claim missing");
  }

  return { userId, accountId };
}

export function authReady(): boolean {
  return jwks !== null;
}

export function setAuthForTests(keySet: JWTVerifyGetKey | null, ep: AuthEndpoints | null): void {
  jwks = keySet;
  endpoints = ep;
}

export const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const [scheme, token] = (c.req.header("Authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    c.set("rejection", "unauthorized");
    return errorResponse("unauthorized", 401);
  }
  try {
    c.set("principal", await verifyToken(token));
  } catch {
    c.set("rejection", "unauthorized");
    return errorResponse("unauthorized", 401);
  }
  await next();
};

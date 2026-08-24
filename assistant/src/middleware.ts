// Every middleware the app mounts, plus the auth machinery behind it.
import type { ErrorHandler, MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { loadConfig } from "@/config.ts";
import { errorResponse } from "@/errors.ts";
import type { AppEnv } from "@/routes.ts";

// --- request id -------------------------------------------------------------

// Stamped first, so everything downstream — logs, error bodies, the usage
// ledger — can be correlated by the same id.
export const requestId: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
};

// --- error boundary ---------------------------------------------------------

// Last resort for anything that throws. Registered with `app.onError`, not as
// middleware: Hono catches handler errors inside its own dispatch, so a
// try/catch wrapped around next() never sees them.
export const errorBoundary: ErrorHandler<AppEnv> = (err, c) => {
  console.error(`[${c.get("requestId") ?? "-"}] unhandled error:`, err.message);
  return errorResponse("internal_error", 500, { requestId: c.get("requestId") });
};

// --- origins ----------------------------------------------------------------

export function corsMiddleware(): MiddlewareHandler<AppEnv> {
  const allowed = loadConfig().ALLOWED_ORIGINS;
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : ""),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  });
}

// Reject browser requests from unknown origins outright; hono/cors only
// withholds the allow headers, which still lets non-preflighted requests run.
export const originGate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && !loadConfig().ALLOWED_ORIGINS.includes(origin)) {
    return errorResponse("cors", 403, {
      detail: `origin ${origin}`,
      requestId: c.get("requestId"),
    });
  }
  await next();
};

// --- auth -------------------------------------------------------------------

// The verified caller: every authenticated route reads this off the context.
export interface Principal {
  userId: string;
  accountId: string;
}

interface AuthEndpoints {
  issuer: string;
  jwksUri: string;
}

const CLOCK_TOLERANCE_SEC = 5;

// Discovery is reached on the unauthenticated path, so a slow or dead IdP is
// amplified by anyone who can send a bogus token: without a bound the request
// hangs to Bun's idle timeout, without dedupe every concurrent request opens
// its own connection, and without a cooldown a hard failure is retried once
// per request forever.
const DISCOVERY_TIMEOUT_MS = 5_000;
const DISCOVERY_RETRY_MS = 60_000;

let jwks: JWTVerifyGetKey | null = null;
let endpoints: AuthEndpoints | null = null;
let discoveryInflight: Promise<AuthEndpoints> | null = null;
let discoveryRetryAt = 0;
let lastDiscoveryError = "";

function accountClaimKey(audience: string): string {
  return audience.endsWith("/") ? `${audience}wt_account_id` : `${audience}/wt_account_id`;
}

// Standard OIDC discovery, the same way the dashboard resolves its authority.
export function discoveryUrl(authority: string): string {
  return `${authority.replace(/\/+$/, "")}/.well-known/openid-configuration`;
}

async function fetchEndpoints(): Promise<AuthEndpoints> {
  const res = await fetch(discoveryUrl(loadConfig().AUTH_AUTHORITY), {
    signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  const doc = (await res.json()) as { issuer?: string; jwks_uri?: string };
  if (!doc.issuer || !doc.jwks_uri) throw new Error("OIDC discovery doc missing issuer/jwks_uri");
  return { issuer: doc.issuer, jwksUri: doc.jwks_uri };
}

export async function initAuth(): Promise<AuthEndpoints> {
  if (endpoints) return endpoints;
  if (Date.now() < discoveryRetryAt) {
    throw new Error(`OIDC discovery in cooldown after: ${lastDiscoveryError}`);
  }

  discoveryInflight ??= fetchEndpoints()
    .then((resolved) => {
      endpoints = resolved;
      jwks = createRemoteJWKSet(new URL(resolved.jwksUri));
      discoveryRetryAt = 0;
      return resolved;
    })
    .catch((err: Error) => {
      lastDiscoveryError = err.message;
      discoveryRetryAt = Date.now() + DISCOVERY_RETRY_MS;
      console.error(
        `OIDC discovery failed (${err.message}) — not retrying for ${DISCOVERY_RETRY_MS / 1000}s`,
      );
      throw err;
    })
    .finally(() => {
      discoveryInflight = null;
    });
  return discoveryInflight;
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
  discoveryInflight = null;
  discoveryRetryAt = 0;
  lastDiscoveryError = "";
}

export const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const [scheme, token] = (c.req.header("Authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) return errorResponse("unauthorized", 401);
  try {
    c.set("principal", await verifyToken(token));
  } catch {
    return errorResponse("unauthorized", 401);
  }
  await next();
};

/**
 * JWT validation — replicates NetBird management's validator + extractor so this
 * service trusts exactly the tokens management does
 * (management/server/auth/jwt/{validator,extractor}.go).
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { loadConfig } from "@/config.ts";
import type { Principal } from "@/types.ts";

interface AuthEndpoints {
  issuer: string;
  jwksUri: string;
}

// Allow a little clock skew, but still reject clearly future-dated tokens.
const CLOCK_TOLERANCE_SEC = 5;

let jwks: JWTVerifyGetKey | null = null;
let endpoints: AuthEndpoints | null = null;

/** NetBird namespaces the account id as `<audience>/wt_account_id`. */
function accountClaimKey(audience: string): string {
  return new URL("wt_account_id", ensureTrailingSlash(audience)).toString();
}

function ensureTrailingSlash(u: string): string {
  return u.endsWith("/") ? u : `${u}/`;
}

/** Resolve issuer + jwks_uri (OIDC discovery when configured, else explicit env). */
export async function initAuth(): Promise<AuthEndpoints> {
  if (endpoints) return endpoints;
  const cfg = loadConfig();

  if (cfg.OIDC_CONFIG_ENDPOINT) {
    const res = await fetch(cfg.OIDC_CONFIG_ENDPOINT);
    if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
    const doc = (await res.json()) as { issuer: string; jwks_uri: string };
    if (!doc.issuer || !doc.jwks_uri) throw new Error("OIDC discovery doc missing issuer/jwks_uri");
    endpoints = { issuer: doc.issuer, jwksUri: doc.jwks_uri };
  } else {
    endpoints = { issuer: cfg.AUTH_ISSUER!, jwksUri: cfg.AUTH_JWKS_URI! };
  }

  jwks = createRemoteJWKSet(new URL(endpoints.jwksUri));
  return endpoints;
}

/**
 * Verify a bearer token and extract the principal.
 * @throws on any validation failure (caller maps to 401).
 */
export async function verifyToken(token: string): Promise<Principal> {
  const cfg = loadConfig();
  // JWTs only; NetBird PATs (opaque `nbp_` tokens) are rejected.
  if (token.startsWith("nbp_")) {
    throw new Error("personal access tokens are not accepted");
  }
  if (!jwks) await initAuth();

  const { payload } = await jwtVerify(token, jwks!, {
    issuer: endpoints!.issuer,
    audience: cfg.AUTH_AUDIENCE,
    clockTolerance: CLOCK_TOLERANCE_SEC,
  });

  // jose validates exp/nbf but not a future iat; management rejects it, so we do too.
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat === "number" && payload.iat > now + CLOCK_TOLERANCE_SEC) {
    throw new Error("token issued in the future");
  }

  const userId = payload[cfg.AUTH_USER_ID_CLAIM];
  if (typeof userId !== "string" || !userId) {
    throw new Error("user id claim missing");
  }

  // Trust accountId ONLY from the token — never a query param/header/body (CWE-639).
  const accountId = payload[accountClaimKey(cfg.AUTH_AUDIENCE)];
  if (typeof accountId !== "string" || !accountId) {
    throw new Error("account id claim missing");
  }

  return { userId, accountId };
}

/** True once JWKS has been initialised — used by /readyz. */
export function authReady(): boolean {
  return jwks !== null;
}

/** Test-only: inject a local key set + endpoints so verifyToken runs offline. */
export function setAuthForTests(keySet: JWTVerifyGetKey | null, ep: AuthEndpoints | null): void {
  jwks = keySet;
  endpoints = ep;
}

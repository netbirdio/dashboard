import { beforeAll, expect, test } from "bun:test";
import {
  createLocalJWKSet,
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from "jose";
import { discoveryUrl, setAuthForTests, verifyToken } from "@/middleware.ts";
import { ACCOUNT_CLAIM, AUDIENCE, AUTHORITY, ISSUER, JWKS_URI, setEnv } from "./env.ts";

let rsaKey: CryptoKey;
let ecKey: CryptoKey;
let rsaJwk: JWK;
let localJwks: ReturnType<typeof createLocalJWKSet>;

const nowSec = () => Math.floor(Date.now() / 1000);

interface MintOpts {
  key?: CryptoKey;
  alg?: string;
  kid?: string;
  iss?: string;
  aud?: string;
  sub?: string;
  account?: string | null;
  iat?: number;
  exp?: number;
}

async function mint(opts: MintOpts = {}): Promise<string> {
  const payload: Record<string, unknown> = {};
  const account = opts.account === undefined ? "acc_1" : opts.account;
  if (account !== null) payload[ACCOUNT_CLAIM] = account;

  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "rsa1" })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? AUDIENCE)
    .setSubject(opts.sub ?? "user_1")
    .setIssuedAt(opts.iat ?? nowSec())
    .setExpirationTime(opts.exp ?? nowSec() + 3600);
  return jwt.sign(opts.key ?? rsaKey);
}

beforeAll(async () => {
  setEnv();
  const rsa = await generateKeyPair("RS256", { extractable: true });
  const ec = await generateKeyPair("ES256", { extractable: true });
  rsaKey = rsa.privateKey;
  ecKey = ec.privateKey;

  rsaJwk = { ...(await exportJWK(rsa.publicKey)), kid: "rsa1", alg: "RS256", use: "sig" };
  const ecJwk: JWK = { ...(await exportJWK(ec.publicKey)), kid: "ec1", alg: "ES256", use: "sig" };
  localJwks = createLocalJWKSet({ keys: [rsaJwk, ecJwk] });
  setAuthForTests(localJwks, { issuer: ISSUER, jwksUri: JWKS_URI });
});

interface DiscoveryStub {
  calls: () => number;
  restore: () => void;
}

// Drops the resolved auth state so verifyToken has to discover, and counts how
// often the discovery endpoint is actually hit.
function stubDiscovery(respond: () => Promise<Response>): DiscoveryStub {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  let calls = 0;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === discoveryUrl(AUTHORITY)) {
      calls++;
      return respond();
    }
    if (url === JWKS_URI) return Response.json({ keys: [rsaJwk] });
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  console.error = () => {};
  setAuthForTests(null, null);
  return {
    calls: () => calls,
    restore: () => {
      globalThis.fetch = realFetch;
      console.error = realError;
      setAuthForTests(localJwks, { issuer: ISSUER, jwksUri: JWKS_URI });
    },
  };
}

test("discoveryUrl derives the well-known endpoint from any authority shape", () => {
  expect(discoveryUrl("https://netbird-localdev.eu.auth0.com")).toBe(
    "https://netbird-localdev.eu.auth0.com/.well-known/openid-configuration",
  );
  expect(discoveryUrl("https://idp.test/")).toBe(
    "https://idp.test/.well-known/openid-configuration",
  );
  expect(discoveryUrl("https://sso.test/realms/netbird")).toBe(
    "https://sso.test/realms/netbird/.well-known/openid-configuration",
  );
});

test("accepts a valid RS256 token and extracts userId from `sub`", async () => {
  const p = await verifyToken(await mint());
  expect(p.userId).toBe("user_1");
});

test("accepts a valid ES256 (EC) token", async () => {
  const p = await verifyToken(await mint({ key: ecKey, alg: "ES256", kid: "ec1" }));
  expect(p.userId).toBe("user_1");
});

test("extracts accountId from the namespaced `<audience>/wt_account_id` claim", async () => {
  const p = await verifyToken(await mint({ account: "acc_42" }));
  expect(p.accountId).toBe("acc_42");
});

test("rejects a token with the wrong issuer", async () => {
  await expect(verifyToken(await mint({ iss: "https://evil.test/" }))).rejects.toThrow();
});

test("rejects a token with the wrong audience", async () => {
  await expect(verifyToken(await mint({ aud: "https://evil.test" }))).rejects.toThrow();
});

test("rejects an expired token", async () => {
  await expect(
    verifyToken(await mint({ iat: nowSec() - 7200, exp: nowSec() - 3600 })),
  ).rejects.toThrow();
});

test("rejects a token whose `iat` is in the future", async () => {
  await expect(verifyToken(await mint({ iat: nowSec() + 3600 }))).rejects.toThrow();
});

test("rejects a NetBird PAT (nbp_ prefix)", async () => {
  await expect(verifyToken("nbp_secrettoken")).rejects.toThrow();
});

test("rejects when the account claim is missing", async () => {
  await expect(verifyToken(await mint({ account: null }))).rejects.toThrow();
});

test("rejects a token signed by an unknown key", async () => {
  const rogue = await generateKeyPair("RS256", { extractable: true });
  await expect(verifyToken(await mint({ key: rogue.privateKey, kid: "rogue" }))).rejects.toThrow();
});

test("concurrent verifications share one OIDC discovery fetch", async () => {
  const stub = stubDiscovery(async () => {
    await Bun.sleep(10);
    return Response.json({ issuer: ISSUER, jwks_uri: JWKS_URI });
  });
  try {
    const token = await mint();
    const principals = await Promise.all([1, 2, 3, 4, 5].map(() => verifyToken(token)));
    expect(principals.map((p) => p.userId)).toEqual(["user_1", "user_1", "user_1", "user_1", "user_1"]);
    expect(stub.calls()).toBe(1);
  } finally {
    stub.restore();
  }
});

test("a failed discovery is not retried on the next request", async () => {
  const stub = stubDiscovery(async () => new Response("upstream down", { status: 503 }));
  try {
    const token = await mint();
    await expect(verifyToken(token)).rejects.toThrow(/discovery failed: 503/);
    await expect(verifyToken(token)).rejects.toThrow(/cooldown/);
    expect(stub.calls()).toBe(1);
  } finally {
    stub.restore();
  }
});

test("concurrent verifications share one failing discovery fetch too", async () => {
  const stub = stubDiscovery(async () => {
    await Bun.sleep(10);
    return new Response("upstream down", { status: 503 });
  });
  try {
    const token = await mint();
    const outcomes = await Promise.allSettled([1, 2, 3, 4, 5].map(() => verifyToken(token)));
    expect(outcomes.every((o) => o.status === "rejected")).toBe(true);
    expect(stub.calls()).toBe(1);
  } finally {
    stub.restore();
  }
});

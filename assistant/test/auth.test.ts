/**
 * JWT validation — the security-critical path. Uses a locally-generated JWKS
 * (RSA + EC) and an injected key set, so it runs fully offline.
 */
import { test, expect, beforeAll } from "bun:test";
import {
  generateKeyPair,
  exportJWK,
  createLocalJWKSet,
  SignJWT,
  type JWK,
  type CryptoKey,
} from "jose";
import { setEnv, ISSUER, AUDIENCE, JWKS_URI, ACCOUNT_CLAIM } from "./env.ts";
import { verifyToken, setAuthForTests } from "@/jwks.ts";

let rsaKey: CryptoKey;
let ecKey: CryptoKey;

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

  const rsaJwk: JWK = { ...(await exportJWK(rsa.publicKey)), kid: "rsa1", alg: "RS256", use: "sig" };
  const ecJwk: JWK = { ...(await exportJWK(ec.publicKey)), kid: "ec1", alg: "ES256", use: "sig" };
  setAuthForTests(createLocalJWKSet({ keys: [rsaJwk, ecJwk] }), { issuer: ISSUER, jwksUri: JWKS_URI });
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

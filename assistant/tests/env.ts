import { resetConfigForTests } from "@/config.ts";

export const AUDIENCE = "https://api.netbird.io";
export const AUTHORITY = "https://idp.test";
export const ISSUER = "https://idp.test/";
export const JWKS_URI = "https://idp.test/.well-known/jwks.json";
export const ACCOUNT_CLAIM = `${AUDIENCE}/wt_account_id`;

const APP_KEYS = [
  "PORT", "NODE_ENV", "ALLOWED_ORIGINS",
  "LLM_MAIN_MODEL", "LLM_FAST_MODEL", "LLM_EFFORT_MAIN",
  "ANTHROPIC_API_KEY",
  "AUTH_AUTHORITY", "AUTH_AUDIENCE",
  "GUARDRAIL_INPUT_CLASSIFIER", "SUGGESTIONS_ENABLED",
  "PRESIDIO_URL", "PRESIDIO_ENTITIES", "PRESIDIO_SCORE_THRESHOLD", "PRESIDIO_TIMEOUT_MS",
  "RATE_LIMIT_ENABLED", "RATE_LIMIT_CHAT_PER_MINUTE", "RATE_LIMIT_CHAT_BURST",
  "RATE_LIMIT_READYZ_PER_MINUTE", "RATE_LIMIT_READYZ_BURST", "TRUST_PROXY",
];

export function setEnv(overrides: Record<string, string> = {}): void {
  for (const k of APP_KEYS) delete process.env[k];
  Object.assign(process.env, {
    AUTH_AUDIENCE: AUDIENCE,
    AUTH_AUTHORITY: AUTHORITY,
    ANTHROPIC_API_KEY: "sk-ant-test",
    ...overrides,
  });
  resetConfigForTests();
}

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
  "DATABASE_URL",
  "RATE_LIMIT_WINDOW_SEC", "RATE_LIMIT_MAX", "TRUST_PROXY_HEADER",
  "LIMIT_USER_DAILY_TOKENS", "LIMIT_USER_MONTHLY_TOKENS", "LIMIT_ACCOUNT_DAILY_TOKENS", "LIMIT_ACCOUNT_MONTHLY_TOKENS",
  "GUARDRAIL_INPUT_CLASSIFIER", "SUGGESTIONS_ENABLED",
  "PRESIDIO_URL", "PRESIDIO_ENTITIES", "PRESIDIO_SCORE_THRESHOLD", "PRESIDIO_TIMEOUT_MS",
  "METRICS_ENABLED", "METRICS_PORT", "METRICS_HOST", "METRICS_AUTH_TOKEN",
  "METRICS_PUSH_URL", "METRICS_PUSH_USER", "METRICS_PUSH_PASSWORD",
  "SERVICE_VERSION", "DEPLOY_ENV", "DEPLOY_HOST",
];

export function setEnv(overrides: Record<string, string> = {}): void {
  for (const k of APP_KEYS) delete process.env[k];
  Object.assign(process.env, {
    AUTH_AUDIENCE: AUDIENCE,
    AUTH_AUTHORITY: AUTHORITY,
    DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    ANTHROPIC_API_KEY: "sk-ant-test",
    ...overrides,
  });
  resetConfigForTests();
}

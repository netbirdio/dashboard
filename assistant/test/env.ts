/** Shared test helper: install a clean, valid baseline env and drop the config cache. */
import { resetConfigForTests } from "@/config.ts";

export const AUDIENCE = "https://api.netbird.io";
export const ISSUER = "https://idp.test/";
export const JWKS_URI = "https://idp.test/.well-known/jwks.json";
export const ACCOUNT_CLAIM = `${AUDIENCE}/wt_account_id`;

// Every app-managed key, cleared before each setEnv so toggles can't leak between files.
const APP_KEYS = [
  "PORT", "NODE_ENV", "ALLOWED_ORIGINS",
  "LLM_MAIN_MODEL", "LLM_FAST_MODEL", "LLM_EFFORT_MAIN", "LLM_MAX_TOKENS", "ANTHROPIC_API_KEY",
  "OIDC_CONFIG_ENDPOINT", "AUTH_ISSUER", "AUTH_JWKS_URI", "AUTH_AUDIENCE", "AUTH_USER_ID_CLAIM",
  "DATABASE_URL", "RATE_LIMIT_WINDOW_SEC", "RATE_LIMIT_MAX",
  "PROBE_RATE_LIMIT_WINDOW_SEC", "PROBE_RATE_LIMIT_MAX", "TRUST_PROXY_HEADER",
  "LIMIT_USER_DAILY_TOKENS", "LIMIT_USER_MONTHLY_TOKENS", "LIMIT_ACCOUNT_DAILY_TOKENS", "LIMIT_ACCOUNT_MONTHLY_TOKENS",
  "GUARDRAIL_INPUT_CLASSIFIER", "MAX_MESSAGES", "MAX_REQUEST_BYTES",
  "METRICS_ENABLED", "METRICS_AUTH_TOKEN", "SERVICE_VERSION",
  "DOCS_ENABLED", "DOCS_CACHE_TTL_SEC", "DOCS_FETCH_MAX_BYTES",
  "DOCS_MAX_SEARCH_RESULTS", "DOCS_MAX_SERVER_ITERS",
  "LLM_SELECTABLE_MODELS",
  "SUGGESTIONS_ENABLED", "SUGGESTIONS_MAX", "SUGGESTIONS_STARTERS",
  "GUARDRAIL_SCRUB_PII",
  "SERVER_TOOL_CACHE_ENABLED", "SERVER_TOOL_CACHE_TTL_SEC", "SERVER_TOOL_CACHE_MAX",
];

export function setEnv(overrides: Record<string, string> = {}): void {
  for (const k of APP_KEYS) delete process.env[k];
  Object.assign(process.env, {
    AUTH_AUDIENCE: AUDIENCE,
    AUTH_ISSUER: ISSUER,
    AUTH_JWKS_URI: JWKS_URI,
    DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    ANTHROPIC_API_KEY: "sk-ant-test",
    ...overrides,
  });
  resetConfigForTests();
}

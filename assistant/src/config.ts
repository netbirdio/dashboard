/**
 * Environment config — parsed and validated once at boot, fails fast on bad input.
 * Every secret (provider API keys, DATABASE_URL) is read here and must never be logged.
 */
import { z } from "zod";

const csv = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Default must be applied to the string BEFORE the transform, else zod types the
// default as the transform's output.
const bool = (def: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(def)
    .transform((v) => v === "true");

const Schema = z
  .object({
    // Server
    PORT: z.coerce.number().default(8787),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform(csv),
    /**
     * Seconds a connection may sit idle before Bun closes it.
     *
     * Bun's default is 10s, which is far too short for this service: a chat turn
     * holds an SSE stream open, and the gap before the first event can exceed
     * that whenever the model is slow to its first token (long prompt, several
     * doc-tool iterations, or the tool-free synthesis pass). The stream would be
     * cut mid-turn and the caller would see a truncated answer.
     *
     * Bun stores this as a single byte, so 255 is a hard ceiling — validated
     * here rather than left to blow up at `Bun.serve`.
     */
    SERVER_IDLE_TIMEOUT_SEC: z.coerce
      .number()
      .int()
      .min(1)
      .max(255)
      .default(240),

    // Models — the main tier drives chat, the fast tier the auxiliary classifier.
    LLM_MAIN_MODEL: z.string().default("claude-sonnet-5"),
    LLM_FAST_MODEL: z.string().default("claude-haiku-4-5"),
    // Models a client may pick via the request `model` field / GET /v1/models.
    // CSV of model ids; the main model is always allowed (prepended if absent).
    // Empty ⇒ only the main model is selectable.
    LLM_SELECTABLE_MODELS: z.string().default("").transform(csv),
    LLM_EFFORT_MAIN: z
      .enum(["low", "medium", "high", "xhigh", "max"])
      .default("medium"),
    /*
      Thinking is explicit rather than left to the model's default, because the
      default differs by model: omitting it runs adaptive on Sonnet 5 and runs
      nothing on Opus 4.8. "off" is available but costs tool use — a
      thinking-disabled Sonnet reaches for tools noticeably less, and this
      assistant is entirely tool-driven.
    */
    LLM_THINKING: z.enum(["adaptive", "off"]).default("adaptive"),
    /*
      Whether the model streams a summary of its reasoning. "omitted" still thinks
      and still bills for it — it just sends nothing back, and the caller then has
      no idea what the model is doing: the status line can only say "Thinking" for
      as long as the turn lasts, which is the whole reason this defaults on now.
      The dashboard doesn't print the summary as prose; it condenses the current
      sentence into one short line (assistant/runtime/thinkingStatus.ts).
    */
    LLM_THINKING_DISPLAY: z
      .enum(["omitted", "summarized"])
      .default("summarized"),
    // Thinking and the answer share this budget, so it is not just answer length.
    LLM_MAX_TOKENS: z.coerce.number().int().positive().default(16000),
    ANTHROPIC_API_KEY: z.string().min(1),

    // Auth — either OIDC discovery or explicit issuer + jwks.
    OIDC_CONFIG_ENDPOINT: z.string().url().optional(),
    AUTH_ISSUER: z.string().url().optional(),
    AUTH_JWKS_URI: z.string().url().optional(),
    AUTH_AUDIENCE: z.string().min(1),
    AUTH_USER_ID_CLAIM: z.string().default("sub"),

    DATABASE_URL: z.string().min(1),

    // Metrics (Prometheus exposition at /metrics).
    METRICS_ENABLED: bool("true"),
    /**
     * Metrics listen on their own port, served by a second Bun.serve that the
     * deployment does not publish — so /metrics is off the public surface without
     * a token to manage. Prometheus reaches it over the private network
     * (`app:9464` in the prod compose).
     */
    METRICS_PORT: z.coerce.number().default(9464),
    /**
     * Interface the metrics server binds. Defaults to all interfaces because in
     * Docker the scraper is a *different container* — 127.0.0.1 would refuse it,
     * and not publishing the port is what keeps it private. Set to 127.0.0.1 when
     * running on bare metal with a local scraper.
     */
    METRICS_HOST: z.string().default("0.0.0.0"),
    // When set, /metrics additionally requires `Authorization: Bearer <token>`.
    // Only needed if you deliberately expose the metrics port beyond the scraper.
    METRICS_AUTH_TOKEN: z.string().optional(),
    SERVICE_VERSION: z.string().default("dev"),
    /**
     * How long the Postgres-backed rollup gauges (today's/this month's tokens,
     * calls, active users) may be reused between scrapes. Prometheus counters
     * cover rates; these answer "how much so far today" without a range query,
     * and survive a restart because Postgres, not the process, holds the total.
     * 0 disables them — no rollup query runs on scrape.
     */
    METRICS_DB_ROLLUP_SEC: z.coerce.number().int().min(0).default(30),

    // Rate limiting (burst; in-memory token bucket)
    RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

    // Probe rate limit (/readyz), keyed per client IP rather than per principal —
    // the probes are unauthenticated. Deliberately far looser than the chat limit:
    // a load balancer polls every few seconds, and answering it matters more than
    // shedding load, so the ceiling only has to stop a flood.
    PROBE_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(10),
    PROBE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // Off by default: X-Forwarded-For is caller-supplied, so trusting it without a
    // proxy in front lets anyone rotate the header to dodge the limit — or forge a
    // peer's address and get them limited. Turn on only when a proxy rewrites it.
    TRUST_PROXY_HEADER: bool("false"),

    // Usage limits (tokens/day, tokens/month) — a ceiling on tokens processed on
    // whichever API key backs the provider. Works self-hosted (BYO-key) or hosted.
    LIMIT_USER_DAILY_TOKENS: z.coerce.number().int().positive().default(1_000_000),
    LIMIT_USER_MONTHLY_TOKENS: z.coerce.number().int().positive().default(10_000_000),
    LIMIT_ACCOUNT_DAILY_TOKENS: z.coerce.number().int().positive().default(10_000_000),
    LIMIT_ACCOUNT_MONTHLY_TOKENS: z.coerce.number().int().positive().default(100_000_000),

    // Guardrails
    GUARDRAIL_INPUT_CLASSIFIER: bool("false"),
    // Server-side PII backstop: scrub structural identifiers (emails, IPs, CIDRs)
    // from user-typed text before the model sees them, in case the frontend's
    // pseudonymization missed something. Non-reversible; conservative.
    GUARDRAIL_SCRUB_PII: bool("true"),
    MAX_MESSAGES: z.coerce.number().int().positive().default(100),
    MAX_REQUEST_BYTES: z.coerce.number().int().positive().default(262_144),

    // Shared cache for PUBLIC server-tool results (docs/API). Cross-customer safe
    // because the output is not user-specific; management tools are never cached.
    SERVER_TOOL_CACHE_ENABLED: bool("true"),
    SERVER_TOOL_CACHE_TTL_SEC: z.coerce.number().int().positive().default(3600),
    SERVER_TOOL_CACHE_MAX: z.coerce.number().int().positive().default(500),

    // Docs tools — server-side web fetch of the public NetBird docs. Unlike the
    // management tools (executed by the caller with the user's JWT), these hit
    // only public, unauthenticated pages, so the server runs them inline and
    // loops until the model has what it needs. All knobs are safe to leave default.
    DOCS_ENABLED: bool("true"),
    // How long the sitemap-seeded search catalog and fetched pages stay cached.
    DOCS_CACHE_TTL_SEC: z.coerce.number().int().positive().default(21_600), // 6h
    // Cap on the text handed back from a single fetch_doc (bytes, post-extraction).
    DOCS_FETCH_MAX_BYTES: z.coerce.number().int().positive().default(60_000),
    // Default/most search_docs results returned to the model.
    DOCS_MAX_SEARCH_RESULTS: z.coerce.number().int().positive().default(8),
    // Safety bound on how many times one chat turn may loop on server-side doc
    // tools before a final, tool-free synthesis pass forces an answer.
    DOCS_MAX_SERVER_ITERS: z.coerce.number().int().positive().default(5),

    // Suggestion chips. After an answer, a cheap fast-tier pass proposes follow-up
    // questions + quick replies (emitted as a `suggestions` SSE event). Starters
    // seed the empty state via GET /v1/suggestions. Fail-soft: never blocks chat.
    SUGGESTIONS_ENABLED: bool("true"),
    SUGGESTIONS_MAX: z.coerce.number().int().positive().max(6).default(3),
    SUGGESTIONS_STARTERS: z
      .string()
      .default(
        "How many peers do I have?," +
          "Which peers are offline?," +
          "Show my access policies," +
          "How do I set up split DNS?," +
          "Create a setup key",
      )
      .transform(csv),
  })
  .refine((c) => c.OIDC_CONFIG_ENDPOINT || (c.AUTH_ISSUER && c.AUTH_JWKS_URI), {
    message: "Provide OIDC_CONFIG_ENDPOINT, or both AUTH_ISSUER and AUTH_JWKS_URI.",
  });

export type Config = z.infer<typeof Schema>;

type Env = Record<string, string | undefined>;

let cached: Config | null = null;

/** Parse + validate the environment. Throws on invalid config. */
export function loadConfig(env: Env = process.env): Config {
  if (cached) return cached;
  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    // z.prettifyError avoids dumping raw values (which could include secrets).
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: drop the cached config so the next loadConfig re-reads the env. */
export function resetConfigForTests(): void {
  cached = null;
}

import { z } from "zod";

const csv = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const bool = (def: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(def)
    .transform((v) => v === "true");

const Schema = z
  .object({
    PORT: z.coerce.number().default(8787),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform(csv),

    LLM_MAIN_MODEL: z.string().default("claude-sonnet-5"),
    LLM_FAST_MODEL: z.string().default("claude-haiku-4-5"),
    LLM_EFFORT_MAIN: z
      .enum(["low", "medium", "high", "xhigh", "max"])
      .default("medium"),
    ANTHROPIC_API_KEY: z.string().min(1),

    AUTH_AUTHORITY: z.url(),
    AUTH_AUDIENCE: z.string().min(1),

    GUARDRAIL_INPUT_CLASSIFIER: bool("false"),
    SUGGESTIONS_ENABLED: bool("true"),

    RATE_LIMIT_ENABLED: bool("true"),
    RATE_LIMIT_CHAT_PER_MINUTE: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_CHAT_BURST: z.coerce.number().int().positive().default(15),
    RATE_LIMIT_READYZ_PER_MINUTE: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_READYZ_BURST: z.coerce.number().int().positive().default(30),
    // Off by default: X-Forwarded-For is attacker-controlled on a directly
    // exposed port, and trusting it there would let one client mint an
    // unlimited number of rate-limit buckets.
    TRUST_PROXY: bool("false"),

    PRESIDIO_URL: z.url().default("http://localhost:5002"),
    PRESIDIO_ENTITIES: z
      .string()
      .default("PERSON,EMAIL_ADDRESS,PHONE_NUMBER,IP_ADDRESS,CREDIT_CARD,IBAN_CODE,US_SSN,CRYPTO")
      .transform(csv),
    PRESIDIO_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
    PRESIDIO_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  });

export type Config = z.infer<typeof Schema>;

type Env = Record<string, string | undefined>;

let cached: Config | null = null;

export function loadConfig(env: Env = process.env): Config {
  if (cached) return cached;
  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetConfigForTests(): void {
  cached = null;
}

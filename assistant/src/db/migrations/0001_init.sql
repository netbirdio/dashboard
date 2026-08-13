-- 0001_init: LLM token-usage schema.

-- One row per model call (chat turn or auxiliary fast-tier task). This is
-- accounting, not an error log: failures are counted in Prometheus
-- (llm_errors_total, classified) and the message goes to stdout.
CREATE TABLE IF NOT EXISTS llm_usage (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id              UUID          NOT NULL,
  conversation_id         TEXT,
  account_id              TEXT          NOT NULL,
  user_id                 TEXT          NOT NULL,
  provider                TEXT          NOT NULL,  -- anthropic
  model                   TEXT          NOT NULL,
  task                    TEXT          NOT NULL,  -- chat | guardrail | suggestions
  input_tokens            INTEGER       NOT NULL DEFAULT 0,
  output_tokens           INTEGER       NOT NULL DEFAULT 0,
  cache_read_tokens       INTEGER       NOT NULL DEFAULT 0,
  cache_creation_tokens   INTEGER       NOT NULL DEFAULT 0,
  latency_ms              INTEGER       NOT NULL DEFAULT 0,
  stop_reason             TEXT,
  tool_calls_requested    INTEGER       NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Token-usage rollups (usage-limit middleware): by user and account, per day/month.
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_time
  ON llm_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_account_time
  ON llm_usage (account_id, created_at);

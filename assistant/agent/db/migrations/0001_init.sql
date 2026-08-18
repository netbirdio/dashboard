CREATE TABLE IF NOT EXISTS llm_usage (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id              UUID          NOT NULL,
  conversation_id         TEXT,
  account_id              TEXT          NOT NULL,
  user_id                 TEXT          NOT NULL,
  provider                TEXT          NOT NULL,
  model                   TEXT          NOT NULL,
  task                    TEXT          NOT NULL,
  input_tokens            INTEGER       NOT NULL DEFAULT 0,
  output_tokens           INTEGER       NOT NULL DEFAULT 0,
  cache_read_tokens       INTEGER       NOT NULL DEFAULT 0,
  cache_creation_tokens   INTEGER       NOT NULL DEFAULT 0,
  latency_ms              INTEGER       NOT NULL DEFAULT 0,
  stop_reason             TEXT,
  tool_calls_requested    INTEGER       NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_user_time
  ON llm_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_account_time
  ON llm_usage (account_id, created_at);

# Metrics & Grafana

The server exposes Prometheus exposition at `GET /metrics` (see `src/telemetry/metrics.ts`) — on its
**own port**, served by a second listener. `PORT` (8787) carries the public API; `METRICS_PORT`
(9464) carries only `/metrics`, and neither compose file publishes it. Prometheus reaches it over the
private network, and the host and internet cannot reach it at all — so metrics are off the public
surface by default, with no shared token to rotate. Config lives in `src/config.ts`:

- `METRICS_ENABLED` (default `true`) — `false` starts no metrics listener at all.
- `METRICS_PORT` (default `9464`) — the metrics listener. Don't publish it.
- `METRICS_HOST` (default `0.0.0.0`) — in Docker the scraper is a *different container*, so binding
  loopback would refuse it; not publishing the port is what makes it private. On bare metal with a
  local scraper, set `127.0.0.1`.
- `METRICS_AUTH_TOKEN` — adds `Authorization: Bearer <token>` on top. Only needed if you deliberately
  expose `METRICS_PORT` (e.g. through a proxy to a central Prometheus).
- `SERVICE_VERSION` — surfaced as `netbird_assistant_build_info{version=...}`.

## Local dev (no Grafana Cloud)

`docker/docker-compose.yml` brings up Postgres **plus** a local Prometheus + Grafana, with the
datasource and this dashboard already provisioned:

```
docker compose -f docker/docker-compose.yml up -d
bun run dev                                    # app on the host, port 8787
open http://localhost:3001/d/netbird-assistant  # no login, dashboard pre-loaded
```

Prometheus (http://localhost:59090) scrapes the host-run app at `host.docker.internal:9464` every
15s, plus a `node-exporter`. Series are stamped `env=dev, host=local` via `relabel_configs` — not
`external_labels`, which apply only on `remote_write` and would leave the dashboard's env/host
selectors empty locally. Retention is 7 days.

The dashboard JSON is provisioned read-through from this directory, so edits made in the Grafana UI
are transient: export the panel/dashboard JSON over `netbird-assistant-dashboard.json` to keep them.
Changing the inlined Prometheus/Grafana config in the compose file needs
`docker compose -f docker/docker-compose.yml up -d --force-recreate <service>`.

## Dashboard layout

Ordered by what you'd want first at 3am, not by subsystem. Each row is one question:

| Row | Answers |
|---|---|
| **Right now** | Is it up, is anyone using it, is it erroring, what does a chat cost? Eight tiles, nothing else. |
| **Is it working?** | Turn outcomes and turn latency — the whole turn, which is what a user waits for. |
| **Is it any good?** | The quality queue: worst tool+reason pairs, failure reasons, sentiment, truncated answers, guardrails, PII. |
| **What it costs** | Cost per chat over time, token mix (cache vs fresh input), the expensive tail. |
| **Models** | Per-model call rate, latency, errors, and how many calls a turn takes. |
| **Tools** | Which tools get used, whether they succeed, how slow they are, doc-cache hit rate. |
| **Usage totals** | The Postgres-backed accumulators — today and this month. |
| **HTTP** | Transport. Request rate, handler latency, why requests were refused. |
| **Service health** | Plumbing: streams in flight, telemetry queue, event-loop lag, rollup staleness, deployed version. |
| **Host** | node-exporter CPU/memory/disk. |

Three headline numbers worth knowing how to read:

- **Turn error ratio**, not HTTP 5xx. A chat turn can return 200 and then fail mid-stream; the 5xx
  rate never sees it. This is the ratio users actually feel.
- **Prompt cache hit ratio** — `cache_read / (cache_read + input)`. With a system prompt this size it
  is the single biggest lever on spend. A sustained drop almost always means the cached prefix
  changed, not that traffic changed.
- **Rollup age** — if it climbs, every Postgres-backed number (cost, active users, tokens today) is
  stale, and the tiles above are quietly lying. Check it before trusting a surprising cost figure.

Every panel filters on `$env`/`$job` (and `$instance` for per-instance series), so stage and prod
never blend when both `remote_write` to the same Grafana Cloud.

## Setup (Grafana Cloud — the default)

`docker/docker-compose.prod.yml` already wires metrics: the **`prometheus`** service scrapes the app's
`/metrics` **and** a **`node-exporter`** (host CPU/memory/disk), then `remote_write`s everything to
Grafana Cloud. Its scrape + remote_write config is inlined in that compose file (under `configs:`) —
there's no separate config file to manage.

1. In Grafana Cloud → **Connections → Prometheus → "Sending metrics"**, copy the write URL, username,
   and generate an API token. Put them in `.env`:
   ```
   GRAFANA_CLOUD_PROM_URL=https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push
   GRAFANA_CLOUD_USER=1616471
   GRAFANA_CLOUD_API_KEY=glc_...
   DEPLOY_ENV=prod          # label on every metric (set to stage on the stage box)
   DEPLOY_HOST=assistant-1  # per-box label (optional)
   ```
2. `docker compose -f docker/docker-compose.prod.yml up -d` — metrics start flowing.
3. In Grafana, **Dashboards → Import** → upload `netbird-assistant-dashboard.json` and pick your
   Grafana Cloud Prometheus datasource.

Every metric carries `env` and `host` labels, so the dashboard's **env** and **host** selectors filter
stage vs prod and per-box — one dashboard, one datasource, both environments.

## Not using Grafana Cloud?

If you run your own/central Prometheus instead, drop the `prometheus` service and point your
Prometheus at the app (and node-exporter) using the same scrape jobs shown in the compose file's
`configs.prometheus_config`. The dashboard and labels are unchanged.

## Cardinality

Labels are bounded sets only — `route`, `method`, `status`, `provider`, `model`, `tier`, `task`,
token `type`. **`account_id` / `user_id` are deliberately never labels** (unbounded → series
explosion). Per-account and per-user token usage is served from Postgres (`llm_usage`), not
Prometheus; Prometheus tracks operational rates/latency and aggregate token throughput.

## Metrics

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `netbird_assistant_http_requests_total` | counter | route, method, status | all rejections (401/402/413/429) are here by status |
| `netbird_assistant_http_request_duration_seconds` | histogram | route, method | handler latency (not stream lifetime) |
| `netbird_assistant_http_requests_in_flight` | gauge | route | |
| `netbird_assistant_llm_requests_total` | counter | provider, model, tier, task, status | status = ok \| error; task = chat \| guardrail \| suggestions |
| `netbird_assistant_llm_request_duration_seconds` | histogram | provider, model, tier, task | model-call latency |
| `netbird_assistant_llm_tokens_total` | counter | provider, model, tier, task, type | type = input \| output \| cache_read \| cache_creation |
| `netbird_assistant_llm_tool_calls_requested_total` | counter | provider, model, tier, task | aggregate count |
| `netbird_assistant_llm_tool_requests_total` | counter | tool, runtime, mutating | **which** tools; runtime = server \| client |
| `netbird_assistant_llm_stop_reasons_total` | counter | tier, task, stop_reason | `max_tokens` here means answers are being truncated |
| `netbird_assistant_llm_errors_total` | counter | code, retryable | code = the `LlmErrorKind` the user's message was built from |
| `netbird_assistant_llm_streams_in_flight` | gauge | — | open streaming turns |
| `netbird_assistant_server_tool_executions_total` | counter | tool, status | status = ok \| error \| blocked (refused by a precondition) |
| `netbird_assistant_server_tool_duration_seconds` | histogram | tool | server-run tool latency, cache hits included |
| `netbird_assistant_server_tool_cache_events_total` | counter | tool, result | result = hit \| miss (shared public docs/API cache) |
| `netbird_assistant_server_tool_cache_entries` | gauge | — | entries held, against `SERVER_TOOL_CACHE_MAX` |
| `netbird_assistant_chat_turns_total` | counter | outcome | answer \| tool_use \| question \| error |
| `netbird_assistant_chat_turn_duration_seconds` | histogram | — | whole turn: doc loop + suggestions, unlike the HTTP histogram |
| `netbird_assistant_chat_model_calls_per_turn` | histogram | — | >1 means the server looped on doc tools |
| `netbird_assistant_rejections_total` | counter | route, reason | see below |
| `netbird_assistant_guardrail_input_checks_total` | counter | verdict | allow \| block \| error (classifier failed → allowed) |
| `netbird_assistant_pii_redactions_total` | counter | kind | IP \| CIDR \| EMAIL replaced before the model saw them |
| `netbird_assistant_session_cost_usd` | gauge | stat | USD per chat today; stat = mean \| p50 \| p95 \| total |
| `netbird_assistant_session_tokens` | gauge | stat | tokens per chat today (input+output+cache) |
| `netbird_assistant_sessions_today` | gauge | — | chats counted today (capped at the sample size) |
| `netbird_assistant_unpriced_model_calls_today` | gauge | — | calls whose model has no price — cost reads low |
| `netbird_assistant_tool_failures_total` | counter | tool, reason | failed steps, classified — see below |
| `netbird_assistant_user_sentiment_total` | counter | kind | frustration \| profanity \| abuse (counts only, never text) |
| `netbird_assistant_suggestions_total` | counter | result | emitted \| empty \| error |
| `netbird_assistant_telemetry_queue_depth` | gauge | — | rows buffered before the batched insert |
| `netbird_assistant_telemetry_rows_written_total` / `netbird_assistant_telemetry_write_failures_total` | counter | — | pipeline health |
| `netbird_assistant_build_info` | gauge | version, node_env | always 1 |
| `netbird_assistant_process_*`, `netbird_assistant_nodejs_*` | — | — | default Bun/Node runtime metrics |
| `node_*` | — | (host) | host CPU/memory/disk from node-exporter — a *separate* exporter, so no prefix |

Every series this service exports is prefixed **`netbird_assistant_`** (`METRIC_PREFIX` in
`src/telemetry/metrics.ts`), runtime metrics included — so `{__name__=~"netbird_assistant_.*"}`
selects the whole service and nothing collides with another NetBird component in the same Prometheus.
Names are written out in full at each definition rather than composed from the constant, so a query
you see on the dashboard is greppable in the repo.

### Rejections

`netbird_assistant_rejections_total` records *why* a request was refused, which the status code can't: a 400 covers a
malformed body, an unknown model, and a guardrail block, and those call for three different
responses. Reasons: `cors`, `unauthorized`, `rate_limited`, `usage_limit`, `too_large`,
`too_many_messages`, `invalid_json`, `invalid_body`, `unknown_model`, `guardrail_blocked`,
`internal_error`, `other`.

### Cost per chat

"What does a conversation cost" needs the calls of one chat grouped together, which is what
`conversation_id` on `llm_usage` is for — every model call a request makes (the answer, the guardrail
pre-screen, the suggestion pass) records it, so nothing is left out of the total.

Cost is **estimated** from token counts against a static price table (`src/telemetry/pricing.ts`, USD per
million tokens, matched by model-id prefix). Cache reads and cache writes are priced at their own rates:
with a system prompt this size they are most of the input, and folding them into the input rate would
overstate the bill several times over. A model with no entry is reported as **unpriced** rather than as
zero — `netbird_assistant_unpriced_model_calls_today > 0` means add the family to that table, and until you do
every cost figure is short.

Read **p50, not the mean**. A day is a handful of control-center builds and a hundred one-line questions;
the mean sits between two things that don't exist. p50 is what a typical chat costs, p95 is what the
expensive ones cost, and the two diverging tells you one kind of conversation is carrying the bill.

Percentiles are computed over per-session rows (capped at 5000 sessions/day, busiest kept — a flat
`netbird_assistant_sessions_today` at that number means sampling), so they can't be derived by dividing the daily
total by the session count.

```sql
-- the most expensive chats today, in tokens (price them with the table in pricing.ts)
SELECT conversation_id,
       SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens) AS tokens,
       COUNT(*) AS calls, MIN(created_at) AS started
FROM llm_usage
WHERE created_at > date_trunc('day', now())
GROUP BY 1 ORDER BY tokens DESC LIMIT 20;

-- per-account spend shape for the month, by model
SELECT account_id, model, COUNT(DISTINCT conversation_id) AS chats,
       SUM(input_tokens) AS input, SUM(output_tokens) AS output
FROM llm_usage
WHERE created_at > date_trunc('month', now())
GROUP BY 1, 2 ORDER BY output DESC;
```

### Assistant quality: `netbird_assistant_tool_failures_total` and `netbird_assistant_user_sentiment_total`

These exist to answer "why is the assistant getting things wrong", which no operational metric can.
Both are read off the transcript the caller already resends on the next turn — so a step that failed
in the *browser* is counted here even though the server never ran it, and nothing was added to the
response path.

`reason` is a bounded classification of the message the tool gave the model
(`src/telemetry/signals.ts`): `bad_reference` (a handle that doesn't resolve), `missing_argument`,
`not_permitted` (wrong mode or node type), `surface_unavailable` (canvas/page not there),
`version_skew` (dashboard older than the tool registry), `api_error`, `aborted`, `unknown`.

Read it as a work queue: a `reason` climbing on one `tool` is usually a schema or executor bug, not
the model being careless — `cc_node`/`bad_reference` was exactly a field the executor forgot to pass
through. **`unknown` climbing means the classifier needs a new pattern**, so treat it as a signal
about this file rather than noise.

`netbird_assistant_user_sentiment_total` counts how users talk to the assistant when it's going wrong: `frustration`
("still doesn't work", "I already told you") is the one worth watching, because it's a bug report
nobody files. Nothing about it changes the answer — it is measurement, not moderation — and the text
is never stored.

After a count moves, the matching sample is in the **logs**, not the database: each tool failure
emits one `{"event":"tool_failure",...}` line on stderr with `tool`, `reason`, `requestId`,
`conversationId` and the tool's own message (`detail`, truncated to 400 chars). Everything in that
line has been through the caller's pseudonymizer and the server's PII vault, so `detail` holds
tokens (`{PEER_3}`), never real names. Sentiment is counted only — no line, no text, ever.

```
# what broke this week, worst first — from the counter
topk(10, sum by (tool, reason) (increase(netbird_assistant_tool_failures_total[7d])))

# what an unknown reason actually looked like — from the logs
… | json | event="tool_failure" | reason="unknown"
```

### Accumulated usage (the Postgres-backed gauges)

Counters give rates and reset with the process. These gauges answer "how much **so far today**",
read from Postgres (`llm_usage`) on scrape — so a deploy mid-day doesn't zero them and no 24h
range query is needed:

| Metric | Labels | Notes |
|---|---|---|
| `netbird_assistant_tokens_today` / `netbird_assistant_tokens_month` | type | input \| output \| cache_read \| cache_creation, since midnight / the 1st, UTC |
| `netbird_assistant_model_calls_today` | task | chat \| guardrail \| suggestions |
| `netbird_assistant_tool_calls_today` | — | tool calls the model requested |
| `netbird_assistant_active_users_today` / `netbird_assistant_active_accounts_today` | — | distinct, today |
| `netbird_assistant_active_users_month` / `netbird_assistant_active_accounts_month` | — | distinct, this month |
| `netbird_assistant_rollup_age_seconds` | — | age of the values above; climbing ⇒ the rollup query is failing |

They are whole-service sums — never per-account, for the cardinality reason above. Refreshed at most
once per `METRICS_DB_ROLLUP_SEC` (default 30s, `0` disables the whole set), so extra scrapers don't
mean extra queries, and a DB outage leaves them stale rather than failing the scrape.

**They are the same DB-wide total on every instance, so aggregate them with `max()`, not `sum()`** —
the dashboard does. Everything else is per-instance and sums normally.

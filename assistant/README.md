# NetBird Assistant

The chat service behind the assistant panel in the NetBird dashboard. A standalone
Bun + Hono process: it validates the caller's JWT, drives Anthropic models, and streams
back text and tool calls.

It is deliberately small in what it is allowed to do:

- **No database.** Nothing is persisted — no conversation history, no usage ledger, no
  rate-limit state that survives a restart.
- **No management API credentials.** It never talks to the NetBird management API. Every
  account read is a *client tool*: the model asks for it, the dashboard performs it in the
  browser with the signed-in user's own session and permissions, and resubmits the result.
  A user can therefore never see through the assistant anything they could not see in the UI.
- **No writes.** Nothing here mutates an account. Change requests end in a draft on the
  control-center canvas that the user reviews and deploys themselves, or in a page the
  assistant opens for them.

The dashboard half of this contract lives in `src/modules/assistant/` of the surrounding
repo: `utils/tools.ts` (the mirrored tool registry), `hooks/useAssistantRuntime.ts` (the
transport and the tool loop), `utils/redaction.ts` (client-side pseudonymization).

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/healthz` | Liveness only. Touches no dependency, so a flaky IdP cannot get the container killed. |
| `GET` | `/readyz` | Ready once OIDC discovery has loaded the JWKS; `503` until then. The dashboard polls it to decide whether to show the assistant at all, which is why it is rate limited per IP. |
| `POST` | `/v1/chat` | One chat turn. Request body is the AI SDK transport's, plus `pageContext`. Response is a UI message stream. |

## Request lifecycle of `POST /v1/chat`

1. **Request id** (`src/middleware.ts`) — stamped first so logs and error bodies correlate.
2. **Origin gate** — an `Origin` outside `ALLOWED_ORIGINS` is rejected with `403`. CORS alone
   only withholds the allow headers, which still lets a non-preflighted request run.
3. **CORS** — `hono/cors`, same allowlist.
4. **JWT verification** — OIDC discovery against `AUTH_AUTHORITY`, then `jwtVerify` against the
   discovered JWKS and issuer with `AUTH_AUDIENCE` as the audience. The principal is `sub` plus
   the `<audience>/wt_account_id` claim. Personal access tokens (`nbp_…`) are refused outright —
   this endpoint takes an interactive session's JWT, nothing else.
5. **Rate limit** (`src/ratelimit.ts`) — mounted *after* auth, so the bucket key is the verified
   `accountId:userId` and not something a caller can pick. `429` carries `Retry-After`.
6. **Body validation** (`src/agent/request.ts`) — 256 KiB, 100 messages, 4000 characters of
   `pageContext`, then the AI SDK's own UI-message validation. Everything about the body is
   settled here, so `chat()` only ever sees a valid request.
7. **PII scrub** (`src/lib/pii.ts`) — before anything reads the text, because the guardrail
   classifier and the suggestions pass are model calls too.
8. **Input guardrail** (`src/agent/guardrails.ts`) — a fast-model prompt-injection screen, off by
   default (`GUARDRAIL_INPUT_CLASSIFIER`), fails open.
9. **`streamText`** (`src/agent/chat.ts`) — system prompt from `src/agent/instructions.md`, the
   full tool set, at most 6 steps and 16k output tokens. The server loops on its own tools; a
   client tool call, or an answered `ask_user`, ends the turn.
10. **PII restore** — the UI message stream is piped through a transform that puts the user's own
    values back into text, reasoning, tool inputs, tool outputs and data parts.
11. **Suggestions** (`src/agent/suggestions.ts`) — only when the turn ended in an answer: a fast
    model turns a question the assistant just asked into tappable replies, written into the stream
    as a `data-suggestions` part. Fails open.

A single line of JSON is logged per turn — request id, conversation id, account id, outcome,
model, step count, duration, and the token usage of each of the three model calls a turn can
make (`usage` for the main model, `guardrailUsage`, `suggestionsUsage`). Never the messages, the
answer, or tool payloads. A guardrail rejection logs too, with `outcome: "blocked"` and no main-model
usage: it never reaches the stream, but the screening call was still billed.

## The tool registry, both sides of it

A tool's **name is its filename**: `src/agent/tools/list_peers.ts` is the tool `list_peers`.
There is no central list to keep in sync, and `registry.ts` discovers the directory at import
time. Files whose name starts with `_` are machinery, not tools (`_contract.ts` holds
`defineTool`, `_schemas.ts` the shared input schemas) — without that convention a colocated
`list_peers.test.ts` would be discovered as a tool called `list_peers.test` and take the process
down at boot.

The split that matters is `runtime`:

- **Server tools** carry an `execute` and run in this process: `search_docs`, `fetch_doc`,
  `get_api_reference` (public documentation and the management OpenAPI spec), `load_skill`,
  and the two that only validate and hand a payload to the UI, `ask_user` and `render_component`.
  Some are marked `cache: true` — their results are public and identical for every account, so
  they are shared across callers through an in-process LRU.
- **Client tools** have no `execute`. The model's call is streamed to the browser, the dashboard
  fulfils it with the user's own session, and the AI SDK resubmits. Every account read and every
  control-center move is one of these.

Because the names are the wire contract, they are pinned from the dashboard side:
`src/modules/assistant/utils/toolParity.test.ts` (vitest, `npm run test:unit`) reads this
directory off disk and fails if a tool has no dashboard entry, or a dashboard entry has no tool.
`load_skill` is on its `SERVER_ONLY` allowlist — the server executes it and the browser never
sees it.

## Skills

Domain depth lives in `src/agent/skills/*.md`, one guide per area, loaded on demand through the
`load_skill` tool. It is not in the always-on prompt because the prompt is tokens on *every*
request, on every turn, for every user: nine tenths of it would be irrelevant to any given
question, and the model reads better from one focused guide than from a wall of every domain at
once. The routing hints ride in `load_skill`'s own description, so they sit inside the cached tool
definitions rather than forming a second always-on block.

Each guide must satisfy the authoring contract in `src/agent/skills.ts`, which is checked when the
module loads, so a malformed guide fails at boot rather than silently becoming unroutable:

- filename `<name>.md`, where name is lowercase letters, digits and hyphens, at most 64
  characters, and contains neither `anthropic` nor `claude`;
- YAML frontmatter with a non-empty `description` of at most 1024 characters — this is the only
  thing the model routes on, so it says both what the guide covers and when to reach for it;
- a non-empty body.

`tests/skills.test.ts` adds the house rules on top: the description's two halves, third person,
and under the 500-line guidance.

One asymmetry is intentional: `## Peers` stays in `instructions.md` while every other domain is a
guide. See the comment on the heading assertion in `tests/skills.test.ts`.

## The PII backstop

Two layers, and only the first one is in this repo's dashboard:

1. **The dashboard** pseudonymizes everything it can recognise before the request leaves the
   browser — peer and user names, emails, IPs, hostnames, DNS labels, ids — into `[PEER_1]`,
   `[EMAIL_2]`, `[IP_3]` tokens, by catalog and by pattern. It swaps them back for display.
2. **This service** catches what a catalog cannot: a person's name typed into free text, above
   all. Every text part of the transcript goes to a [Presidio](https://microsoft.github.io/presidio/)
   analyzer sidecar, and each finding is swapped for a `[REDACTED_PERSON_1]`-style token from a
   vault that lives for exactly one request — never persisted, never logged, never sent anywhere.
   The tokens use their own namespace so they can never collide with the dashboard's. On the way
   out, `restoreChunkStream` puts the real values back, because they were this user's own words.

**It fails open.** An unreachable or slow analyzer does not fail the request: the backstop reduces
what reaches the model provider, and turning every analyzer hiccup into a chat outage would trade
a privacy improvement for an availability regression. One failure opens a 30-second circuit
breaker so a dead analyzer produces one log line instead of one per text part per turn.

The operational consequence has to be stated plainly: **with no analyzer reachable, free-text
personal names reach the model provider in the clear.** Everything the dashboard recognises is
still pseudonymized — that layer is client-side and unaffected — but the second layer is simply
not applied. `docker-compose.prod.yml` therefore gates the app on the analyzer's health check
rather than starting both at once, and the failure is logged as
`pii backstop unavailable at … — continuing unscrubbed`. Alert on that line.

## Configuration

All of it is validated once at startup by `src/config.ts`; an invalid value is a hard failure,
not a fallback. `.env.example` is the annotated copy to start from.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `AUTH_AUTHORITY` | yes | — | OIDC issuer URL, discovered at `/.well-known/openid-configuration` for the JWKS. Same value as the dashboard's `authAuthority`. |
| `AUTH_AUDIENCE` | yes | — | Expected audience claim, and the prefix of the `wt_account_id` claim. Same value as the dashboard's `authAudience`. |
| `ANTHROPIC_API_KEY` | yes | — | Provider credential for every model call. |
| `PORT` | no | `8787` | Listen port. |
| `NODE_ENV` | no | `development` | `development`, `production` or `test`. |
| `ALLOWED_ORIGINS` | no | `http://localhost:3000` | Comma-separated browser origins allowed by the origin gate and CORS. Must contain the dashboard's origin. |
| `LLM_MAIN_MODEL` | no | `claude-sonnet-5` | The model that answers and calls tools. |
| `LLM_FAST_MODEL` | no | `claude-haiku-4-5` | The cheap model behind the input guardrail and the suggestions pass. |
| `LLM_EFFORT_MAIN` | no | `medium` | Reasoning effort for the main model: `low`…`max`. Dropped automatically for models that predate the option. |
| `GUARDRAIL_INPUT_CLASSIFIER` | no | `false` | Turns on the prompt-injection pre-screen. One extra fast-model call per turn. |
| `SUGGESTIONS_ENABLED` | no | `true` | Turns on the quick-reply pass after an answered turn. |
| `RATE_LIMIT_ENABLED` | no | `true` | Master switch for both token buckets. |
| `RATE_LIMIT_CHAT_PER_MINUTE` | no | `30` | Sustained `/v1/*` refill rate, per authenticated user. |
| `RATE_LIMIT_CHAT_BURST` | no | `15` | Bucket capacity for `/v1/*` — what one question may spend at once, since each client tool round is another request. |
| `RATE_LIMIT_READYZ_PER_MINUTE` | no | `60` | Sustained `/readyz` refill rate, per client IP. |
| `RATE_LIMIT_READYZ_BURST` | no | `30` | Bucket capacity for `/readyz`. |
| `TRUST_PROXY` | no | `false` | Read the client IP from `X-Forwarded-For`. Only turn this on behind a proxy you control: on a directly exposed port the header is caller-supplied, and trusting it lets one client claim unlimited `/readyz` buckets. |
| `PRESIDIO_URL` | no | `http://localhost:5002` | Analyzer base URL. The prod compose overrides it to `http://presidio:3000`. |
| `PRESIDIO_ENTITIES` | no | `PERSON,EMAIL_ADDRESS,PHONE_NUMBER,IP_ADDRESS,CREDIT_CARD,IBAN_CODE,US_SSN,CRYPTO` | Entity types requested from the analyzer. |
| `PRESIDIO_SCORE_THRESHOLD` | no | `0.6` | Minimum confidence for a finding to be redacted. |
| `PRESIDIO_TIMEOUT_MS` | no | `2000` | Per-call analyzer timeout. On expiry the breaker opens and the turn continues unscrubbed. |
| `ASSISTANT_IMAGE` | compose only | `netbird-assistant:latest` | Image tag used by `docker/docker-compose.prod.yml`. Not read by the service. |
| `PRESIDIO_IMAGE` | compose only | `ghcr.io/data-privacy-stack/presidio-analyzer:2.2.364` | Analyzer image used by `docker/docker-compose.prod.yml`. Not read by the service. |

On the dashboard side, one variable points the browser here: `NETBIRD_ASSISTANT_API_ENDPOINT`.
`docker/init_react_envs.sh` also adds it to the dashboard's CSP, because the browser streams the
chat directly from this origin. Leave it unset and the assistant does not appear at all.

## Running it

Development — the analyzer in Docker, the service on the host under `bun --watch`:

```bash
cd assistant
cp .env.example .env          # fill in AUTH_*, ANTHROPIC_API_KEY
bun install
docker compose -f docker/docker-compose.yml up -d presidio
bun run dev
```

The analyzer's first start is slow: the health check allows 90 seconds for the NLP models to
load, and it is published on loopback only. Without it the service still runs — see fail-open
above.

Production — both containers, the analyzer internal only:

```bash
cd assistant
# .env sits here, next to package.json: the compose file reads ../.env
ASSISTANT_IMAGE=ghcr.io/netbirdio/netbird-assistant:latest \
  docker compose -f docker/docker-compose.prod.yml up -d
```

`app` waits for the analyzer's health check before it starts, so the first requests after a deploy
are not served with redaction failing open. The image is built from `docker/Dockerfile` (the
build context is `assistant/`, and `docker/Dockerfile.dockerignore` is its ignore file — note that
`src/agent/*.md` must stay in the image, since the prompt and the guides are markdown).

## Tests

```bash
cd assistant
bun test
bun run typecheck
```

CI runs both on any change under `assistant/**` (`.github/workflows/assistant.yml`). No secrets
are needed: `tests/env.ts` supplies every variable the suite reads, and nothing in `bun test`
reaches the network or a model provider.

`tests/presidio.test.ts` is the exception — it exercises the real analyzer's wire contract, which
mocked tests by definition cannot. It self-skips when no analyzer answers, so it gates nothing in
CI. To actually run it:

```bash
docker compose -f docker/docker-compose.yml up -d presidio && bun test presidio
```

The tool-name parity test lives on the dashboard side and runs with the dashboard's suite
(`npm run test:unit` at the repo root), so a tool added here without its dashboard counterpart
fails there, not in this service's CI.

## Evals

```bash
bun run eval                    # the configured main model
bun run eval claude-haiku-4-5   # any model id
```

`evals/run.ts` scores routing: for each case in `evals/cases.ts` it looks at the *first* tool
batch and checks two things — which guides the model loaded (recall and precision, since
over-loading costs a step and drags in irrelevant context) and which tools it reached for
(`expectTools` / `forbidTools`). It reports per-guide recall and per-tool called/avoided rates,
so a single weak description is visible rather than averaged away. Tools are handed over
spec-only, with `execute` stripped, so an eval cannot fetch a doc or touch anything.

This makes **real, paid API calls**, which is exactly why it is a separate command and not part
of `bun test` or CI. Run it when you change the system prompt, a skill description, or a tool
description.

## Known limitations

- **The rate limiter is in-memory.** The limit is therefore per container: N replicas admit up to
  N times the configured rate, and a rolling deploy resets every bucket. It is a brake on a
  runaway script, not a quota system. A real per-tenant quota needs shared, durable state, which
  would mean giving this service a database.
- **There is no persistence at all.** No conversation history — history lives in the browser and
  is resent on every turn, which is why the request caps and the prompt-cache breakpoint matter.
  No usage ledger either: what a turn cost exists only in the `chat_turn` log line.
- **There is no `/metrics`.** A Prometheus endpoint and a Grafana dashboard were removed in the
  restructure and have not been replaced. Cost and error-rate tracking today means scraping the
  structured `chat_turn` logs. If you need the numbers continuously, ship those log lines
  somewhere that can aggregate them.
- **There are no per-turn quality signals.** The same restructure removed the turn-signals module,
  which classified tool failures and inferred user sentiment from the next message and emitted
  both alongside the metrics. Nothing derives "did this turn go badly" today: the `chat_turn` log
  line is the only telemetry, and reading failure or frustration out of it is on whoever consumes
  the logs.
- **The PII backstop is best-effort by design.** See above: fail-open means an outage of the
  analyzer degrades privacy silently rather than loudly.

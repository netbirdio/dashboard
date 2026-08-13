# NetBird AI Assistant — Standalone Agent Server

> Architecture and module map for this service. For how to work in the repo see AGENTS.md; for
> background and rationale see CONTEXT.md.

## Context

This is an AI assistant for the NetBird dashboard, built as a **separate standalone service** that
never runs inside the management server and has **no access to it**. Users send a prompt with their
JWT; the service validates the JWT, applies guardrails + rate limits + cost caps, records telemetry,
and drives an Anthropic model.

Tools are split by **who executes them** (`runtime` on the registry):

- **Client tools** (the management API: peers, groups, policies, …) run in the **caller** with the
  user's JWT. On such a tool the service returns the request and ends the turn; the caller executes
  it and re-POSTs the result — loop until a final answer.
- **Server tools** (documentation lookups, inline UI rendering) touch only **public** endpoints or
  local rendering, so the service executes them **inline** and loops the model itself, streaming
  progress — no caller round-trip.

This is the "augmented LLM with tool execution" pattern from Anthropic's
[Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents): one
model + tools + streaming, add routing/orchestration only where it earns its keep. Two properties
still hold: the service needs **no path to management** (management tools run in the caller; server
tools reach only public docs / do local UI validation), and the **blast radius is bounded by the
user's own RBAC** (every management action executes with the user's JWT).

### Scope
- **Server only.** This service defines the HTTP API contract the client uses and serves no UI.
- Target product is **NetBird**; the JWT conventions below are NetBird's, configurable via env.

### Design
- **Runtime:** **Bun, native — no framework.** `Bun.serve({ routes })` for routing, `Bun.sql` for
  Postgres.
- **State model:** **stateless** — the caller holds the transcript and re-sends `messages[]` each
  turn; token cost is controlled by prompt caching, not server-side sessions. No sticky sessions.
- **Telemetry store:** Postgres (token usage per model call).
- **LLM layer:** provider-neutral `src/llm/` — app code depends on the `LlmProvider` interface, not the
  SDK. Anthropic is the provider; two tiers (main = chat, fast = the guardrail classifier) each pick a
  model from config.
- **Deployment:** Docker Compose (`docker/`), deployable on EC2 behind a load balancer: 12-factor
  config, stateless, health/readiness probes, graceful shutdown, horizontal-scale-safe.

### Bun notes
- **Routing:** `Bun.serve({ routes })`, static + `:param`. Middleware is a small hand-rolled
  `compose()` (cors → auth → rate-limit → usage-limit), since there's no `app.use()`.
- **SQL:** `Bun.sql` is a first-class Postgres client.
- **Migrations:** plain `.sql` files + a tiny runner recording versions in `schema_migrations`
  (`src/db/migrate.ts`).

---

## Architecture (server only)

```
Caller (holds messages[])                 Assistant server (Bun, native, stateless)          Anthropic
  │  POST /v1/chat (+ Bearer JWT) ────────▶ compose( cors → auth(JWKS) → rateLimit →
  │  {messages:[...], model?}                usageLimit ) → chat handler
  │                     ◀──── SSE deltas ── stream Messages API, forward text deltas ──────▶ streams
  │                     ◀─ tool_activity ── SERVER tools (docs, render_component): run       ◀── deltas
  │                     ◀── component ───── inline, emit progress/component, loop model
  │                     ◀── tool_use+stop ─ CLIENT tools: vet vs allowlist, emit, end turn
  │  executes tool_use                       (+ appendMessages, serverToolResults)
  │  against MGMT API (its own JWT)          ◀─ suggestions ─ fast-tier chips after final
  │  appends tool_result                                   │ async, non-blocking
  └─ POST /v1/chat again          Postgres (telemetry)   rate-limit store   fast tier (guardrail,
                                                                             suggestions)
```

The agent loop spans caller + server across HTTP turns; each `POST /v1/chat` is one streamed model
turn (which may internally loop over server tools). Fully stateless.

---

## Module map (see `src/`)

| Path | Responsibility |
|---|---|
| `src/index.ts` | `Bun.serve` route table + middleware wiring; boot auth; SIGTERM drain |
| `src/config.ts` | env parse + validate (zod); fail fast |
| `src/types.ts` | provider-neutral domain types |
| `src/jwks.ts` | `jose` JWKS verify + claim extraction (replicates management) |
| `src/http/{compose,cors,sse}.ts` | middleware chain (no `app.use()`), CORS, SSE writer |
| `src/middleware/auth.ts` | Bearer → `verifyToken` → `ctx.principal` |
| `src/middleware/rateLimit.ts` | burst limit per account+user (in-memory) |
| `src/middleware/usageLimit.ts` | per user + account token ceilings (402) |
| `src/guardrails/{input,output}.ts` | input size/shape + pre-screen; output tool allowlist |
| `src/guardrails/pii.ts` | server-side PII scrub of user text (backstop to frontend redaction) |
| `src/llm/provider.ts` | provider-neutral `LlmProvider` interface (streamChat/complete) |
| `src/llm/registry.ts` | tier → (provider instance, model) resolution; per-request model override |
| `src/llm/anthropic.ts` | Anthropic impl; owns all SDK translation (SDK isolated here) |
| `src/llm/tools.ts` | tool registry (neutral `LlmTool` + `mutating` + `runtime` client/server) |
| `src/llm/serverTools.ts` | dispatch for server-executed tools (docs, render_component) |
| `src/llm/serverToolCache.ts` | shared cross-customer TTL cache for public server tools |
| `src/llm/models.ts` | selectable-model allowlist (client model selector) |
| `src/llm/suggestions.ts` | fast-tier follow-up/quick-reply chip generation |
| `src/llm/system.md` | frozen system prompt (cacheable, provider-neutral) |
| `src/docs/{sources,catalog,fetch,execute}.ts` | doc tools: sitemap index + search, MDX/HTML fetch, executor |
| `src/docs/api.ts` | `get_api_reference` — OpenAPI endpoint/schema lookup |
| `src/ui/{components,render}.ts` | inline-component schema registry + `render_component` tool |
| `src/privacy/redaction.ts` | pseudonymization spec + reference `Redactor` (privacy boundary) |
| `src/routes/chat.ts` | `POST /v1/chat` — streamed turn (internal server-tool loop) |
| `src/routes/models.ts` | `GET /v1/models` — selectable models |
| `src/routes/suggestions.ts` | `GET /v1/suggestions` — curated starter prompts |
| `src/routes/health.ts` | `/healthz`, `/readyz` |
| `src/telemetry/store.ts` | `Bun.sql` writer (async/batched) + token-usage aggregates |
| `src/telemetry/metrics.ts` | Prometheus registry + helpers + `GET /metrics` |
| `src/db/migrate.ts` + `migrations/*.sql` | migration runner + schema |

---

## Key design points

### LLM layer (`src/llm/`)
- Provider-neutral: app code depends only on the `LlmProvider` interface (`streamChat` + `complete`)
  and neutral domain types (`LlmMessage`/`LlmTool`/`LlmContentBlock`/`Usage`). The vendor SDK is
  imported only in `src/llm/anthropic.ts`. Anthropic is the provider.
- **Two tiers** resolve to a model from config (`LLM_MAIN_MODEL` default `claude-opus-4-8`,
  `LLM_FAST_MODEL` default `claude-haiku-4-5`): `main` drives the chat turn, `fast` backs the optional
  guardrail classifier in `guardrails/input.ts`.

### JWT validation — replicate NetBird management (`server/auth/jwt/validator.go` + `extractor.go`)
- `jose.createRemoteJWKSet` — JWKS fetch, `kid` match, RSA + EC, honors `Cache-Control: max-age`.
- Verify signature + `iss` + `aud` + `exp` + `nbf`; **reject future `iat`** (management's
  `WithIssuedAt`).
- `userId` from `AUTH_USER_ID_CLAIM` (default `sub`); **`accountId` from the namespaced claim
  `${AUTH_AUDIENCE}/wt_account_id`**. Trust `accountId` **only** from the token — never a query param
  (management enforces the same; CWE-639).
- JWT-only; reject NetBird PATs (`nbp_…`).
- Issuer + jwks_uri from `OIDC_CONFIG_ENDPOINT` discovery, or explicit `AUTH_ISSUER` + `AUTH_JWKS_URI`.

### System prompt & guardrails
- **System prompt:** `src/llm/system.md`, loaded once and frozen so the prompt cache stays valid.
- **Input guardrails:** zod shape validation + byte/message caps (413 on oversize) + optional
  fast-model injection/abuse pre-screen.
- **Output guardrails:** enforce the tool allowlist (deny unknown tools); `mutating` tools flagged so
  the caller gates them behind confirmation. Tool results are **untrusted data** (prompt-injection
  posture).

### Tool registry
- Typed, allowlisted tools (not a generic `api_call`) so the caller has an allowlist and can
  gate/render per action. Each tool carries `mutating` (confirmation gate) and `runtime`:
- **Client (management), read-only:** `list_peers`, `get_peer`, `list_groups`, `list_policies`,
  `list_routes`, `list_nameserver_groups`, `list_setup_keys`, `list_users`, `get_account_settings`,
  `list_events`. Executed by the caller with the user's JWT; `mutating` ones require confirmation.
- **Server:** `search_docs`, `fetch_doc`, `get_api_reference` (docs/API), `render_component` (UI).
  Executed inline by the service; never surfaced to the caller for execution.

### Pseudonymization — the privacy boundary (`src/privacy/`)
- The model and this server **never see real identifiers**. The caller executes a management tool,
  then **redacts the result through `src/privacy/redaction.ts` before sending it back**: real values
  become type-preserving, identity-hiding placeholders (`peer_1`, `ip_3`, `email_2`). The model
  reasons over placeholders (it keeps kinds + structure, loses identity); the caller reverses them in
  the output for display and maps them back to real ids for follow-up calls.
- `redaction.ts` is the single source of truth (grounded in the NetBird OpenAPI) and is an
  **allowlist, default-deny**: each resource declares `keep` (safe pass-through) + `transform`
  (allowed only as placeholders) + `handle`; **every other field — including ones the API adds
  later — is dropped**, so nothing leaks by omission. Plus a reference `Redactor` (stable per-value
  tokens, id+name collapse to one handle carrying real id + display name). Publishable as a shared
  package so the frontend redacts/restores identically.
- The system prompt tells the model identifiers are opaque pseudonyms: echo them exactly, never infer
  or fabricate a real name/IP/email.
- **Server-side backstop (`guardrails/pii.ts`, `GUARDRAIL_SCRUB_PII`):** in case the frontend misses
  something, user-authored text/tool_result content is scrubbed of structural PII (emails, IPv4/IPv6,
  CIDR) before the model call. Conservative (no bare domains, so doc URLs survive) and non-reversible;
  it can't catch resource *names* — that stays the frontend's job.

### Shared server-tool cache (`llm/serverToolCache.ts`, `SERVER_TOOL_CACHE_*`)
- Results of the PUBLIC server tools (`search_docs`, `fetch_doc`, `get_api_reference`) are cached in a
  bounded TTL cache keyed by tool name + input — **shared across customers** because the output is not
  user-specific. Management (client) tools never reach this server and are never cached (that would
  leak one account's data to another); `render_component` is excluded (per-call UI). Complements the
  existing data-layer caches (fetched pages, OpenAPI index) with cross-request dedup.

### Docs tools (`src/docs/`)
- Server-executed because they read only **public** pages (no JWT). `search_docs` ranks a catalog
  seeded from the doc sitemaps (docs.netbird.io + netbird.io/knowledge-hub), TTL-cached. `fetch_doc`
  resolves a docs URL to its **raw MDX on GitHub** (clean text), falling back to HTML→text scraping
  for generated pages (`/api/*`) and the knowledge hub. Host-allowlisted (SSRF guard), size-capped.
- The chat route loops on server tools: for a docs-only turn it runs search/fetch and re-calls the
  model until it answers (bounded by `DOCS_MAX_SERVER_ITERS`, then a tool-free synthesis pass).
- Self-updating: no doc content lives in the prompt; the catalog rebuilds from the live sitemap.

### Interactive components (`src/ui/`)
- The model renders an inline component by **calling `render_component`** (not by emitting free-form
  JSON). Input is schema-enforced by the provider, then strictly validated against the zod registry
  in `components.ts`; on failure the model gets an error tool_result and retries — an invalid
  component can never reach the frontend. On success the service emits a `component` SSE event.
- Small, stable set: `canvas_preview` (preview a pending change; optional `action` runs a
  `mutating` client tool behind the existing confirmation gate) and `resource_table`. `components.ts`
  is the single source of truth, publishable as a shared package the dashboard validates against.

### Suggestions & model selection
- **Suggestions:** after the final answer, a cheap fast-tier pass proposes follow-up questions +
  quick replies, emitted as a `suggestions` SSE event (fail-soft; never blocks the answer). Curated
  empty-state starters come from `GET /v1/suggestions`. See `src/llm/suggestions.ts`.
- **Model selector:** `GET /v1/models` exposes a server-configured allowlist (`LLM_SELECTABLE_MODELS`,
  main model always included/default). `POST /v1/chat` accepts an optional `model`, rejected (400) if
  not allowlisted — the browser can never pick an arbitrary/expensive model. Telemetry already
  attributes tokens per model.

### Usage tracking & limits
- Per model call: record token counts (input/output/cache) in `llm_usage`, one row per call. Writes
  async/batched — never add latency. No dollar cost is computed (the API returns tokens, not prices).
- Reporting: SQL rollups per `account_id` and per `user_id` over day/month → **token usage per user
  and per account**, split by task/model.
- Usage limit (`middleware/usageLimit.ts`): per-user + per-account daily/monthly **token** ceilings;
  reject (402) before the model call when a cap is hit. Rate limiting handles burst; the usage limit
  bounds tokens. Works self-hosted (bring-your-own-key) or hosted.

### Metrics — `src/telemetry/metrics.ts`
Prometheus exposition at `/metrics` (see `grafana/`). Low-cardinality labels only (route/provider/model
/tier/task/status) — never per-account/user. Guarded by `METRICS_AUTH_TOKEN` when set.

### Chat route
- Validate → guardrails → rate + usage limit → `client.messages.stream(...)`.
- Prompt caching: `cache_control: ephemeral` on the last tool + system (stable prefix) and the last
  history block; mind the 20-block lookback in tool loops.
- SSE events: `text` (deltas), `tool_activity` (server-tool progress), `component` (validated UI),
  `tool_use` (client tools to execute, with `appendMessages` + `serverToolResults` for consistency),
  `suggestions` (post-answer chips), `final`, `done`, `error`.
- Server-tool loop: on `tool_use`, run any server tools (docs/UI) inline and re-call the model; end
  the turn only when a **client** tool is requested (or on `end_turn`). Do **not** use the SDK
  tool-runner. `appendMessages`/`serverToolResults` carry intermediate server turns to the caller so
  the resent transcript stays consistent across a mixed turn.

---

## Verification (end-to-end)
1. **Unit:** JWT validation vs mock JWKS (RSA + EC) — accept valid; reject bad `iss`/`aud`/expired/
   future-`iat`; assert namespaced `accountId`. Rate limit → 429; usage limit → 402.
2. **Local run:** `bun run src/index.ts`; `curl /healthz`, `/readyz`; `bun run migrate`.
3. **Streaming:** valid NetBird token → `curl -N /v1/chat` → SSE text deltas.
4. **Tool round-trip:** message triggers a read tool → server returns `tool_use` + ends turn → POST
   `tool_result` back → final answer.
5. **Telemetry:** `chat` rows land in Postgres with token counts and `provider`; run per-user /
   per-account token rollups.
6. **Guardrails:** off-topic/abusive input flagged/blocked; non-allowlisted `tool_use` rejected.
7. **Metrics:** `curl /metrics` returns Prometheus exposition (HTTP, LLM, telemetry, runtime); import
   the Grafana dashboard under `grafana/`.

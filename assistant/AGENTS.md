# AGENTS.md

Guidance for AI agents (and humans) working in the **netbird-assistant** repo. Read
[CONTEXT.md](./CONTEXT.md) for the why and [PLAN.md](./PLAN.md) for the full build plan and module map.

## What this repo is

A standalone Bun/TypeScript HTTP server: a NetBird AI assistant. It validates NetBird JWTs, drives
Anthropic models, streams responses over SSE, and records cost/telemetry to Postgres. It is
**stateless** and has **no access to the NetBird management server** — tool calls are executed by the
caller, not here.

## Ground rules (do not violate)

- **No path to management.** This service must never call the NetBird management API or hold NetBird
  credentials. Tools are *described* here and *executed by the caller* with the user's JWT.
- **Stateless.** No server-side conversation state, no sticky sessions. The caller sends the full
  `messages[]` each turn. Don't introduce per-session server storage. The PII vault
  (`guardrails/pii.ts`) is the one in-memory mapping, and it lives for a single REQUEST: tokens go to
  the model, real values are restored on everything streamed back, and a later turn re-scrubs the
  transcript the caller resends. Never persist or log it, and never let it grow a conversation key.
- **Trust `accountId` only from the validated JWT** — never from a query param, header, or body
  (CWE-639; management enforces the same).
- **Secrets never leave the server and never hit logs.** `ANTHROPIC_API_KEY`, `DATABASE_URL`, and
  JWTs must not be logged. Don't log message bodies either — that includes anything holding
  pre-scrub text or the PII vault's mapping.
- **Scrub before the first model call, restore on the last write out.** Structural PII is tokenised
  ahead of the input classifier (itself a model call) and restored in `sse.send`, the single exit.
  A new model call on raw input, or a new response path that bypasses that wrapper, breaks the
  guarantee. Two exceptions by design: `thinking` blocks are carried verbatim (their signature covers
  the text), and streamed deltas restore through a buffer so half a token never ships.
- **Keep `src/llm/system.md` frozen.** No timestamps, IDs, or interpolation — a byte change breaks
  the Anthropic prompt cache. If it must vary, it doesn't belong in the system prompt.
- **Tool allowlist is enforced server-side.** Any `tool_use` the model emits must be a known tool in
  `src/llm/tools.ts`. `mutating` tools stay flagged so the caller can gate them behind
  confirmation.
- **Control-center tools (`cc_*`) describe a canvas, not an API.** They're `runtime: "client"` like the
  rest — the dashboard executes them against the control-center canvas it has open. They only ever
  touch a *draft* (local until the user deploys it) or the camera, so none is `mutating` and none may
  grow into a deploy: that click stays the user's. Node handles are `{NODE_n}` placeholders, minted by
  the caller alongside the usual resource tokens.
- **Usage is tracked per model call.** Every LLM call must record a telemetry row with token counts
  (`src/telemetry/store.ts`). Don't add a model call that skips this — it feeds the usage limit
  (`middleware/usageLimit.ts`, a per-user/account token ceiling) and per-user/account reporting.
- **Provider SDKs stay isolated.** Import the `@anthropic-ai/sdk` **only** inside `src/llm/anthropic.ts`.
  Everywhere else depends on the neutral `LlmProvider` interface and the neutral domain types in
  `src/types.ts`.

## Conventions

- **Comments:** keep only the non-obvious *why* — the rationale a reader can't recover from the
  code itself (e.g. CWE-639, prompt-cache byte-stability, the streaming telemetry drain). Don't
  restate *what* the code does. If a piece of code needs a paragraph-long comment or a workaround to
  be understood, treat that as a smell and fix the code instead of explaining it.
- **Runtime:** Bun (native). Use `Bun.serve({ routes })`, `Bun.sql`, `Bun.file`. No Express/Hono.
- **Language:** TypeScript, `strict` + `noUncheckedIndexedAccess`. Avoid `any` and unchecked `as`.
- **Imports:** use the `@/` path alias (maps to `src/`) and keep the `.ts` extension
  (`allowImportingTsExtensions`).
- **Config:** all runtime config flows through `src/config.ts` (zod-validated). Add new env vars there
  and to `.env.example` — never read `process.env` directly elsewhere.
- **Middleware:** small functions matching the `Middleware` type in `src/http/compose.ts`; return a
  `Response` to short-circuit or `undefined` to pass through. Wire them in `src/index.ts`.
- **Errors:** map to clear HTTP statuses (401 auth, 402 usage-limit, 413 too-large, 429 rate-limit).
  Use the Anthropic SDK's typed errors; don't string-match error messages. Mid-stream failures go
  through `llm/errors.ts`: the adapter classifies (it owns the SDK's error classes) into a neutral
  `LlmError`, and `describeFailure` words it for the user — say what they can DO, leak no internals
  (no provider names, status codes or exception text). The `code` is for logs and metrics only.
- **LLM usage:** resolve a tier via `providerFor("main" | "fast")` from `src/llm/registry.ts`; never
  instantiate a provider directly in app code. Models are env-overridable per tier (defaults
  `claude-sonnet-5` / `claude-haiku-4-5`), and `LLM_SELECTABLE_MODELS` is what the dashboard's picker
  offers. Per-model capability facts that change the request shape live in `llm/models.ts`
  (`supportsEffort`, `supportsAdaptiveThinking`) — not in the adapter, which only translates.
  **Thinking and effort are sent explicitly, never left to the provider default**: that default is
  model-dependent (omitting `thinking` runs adaptive on Sonnet 5 and nothing on Opus 4.8), so a silent
  default would mean the same code behaves differently per model. `LLM_THINKING=off` is supported but
  costs tool use — a thinking-disabled model reaches for tools noticeably less, and every useful thing
  this assistant does is a tool call. For the Anthropic adapter, consult
  the `claude-api` skill for current model IDs, streaming, tool use, and prompt-caching syntax.

## Layout

```
src/index.ts            entrypoint: routes + middleware + graceful shutdown
src/config.ts           env schema (zod)
src/types.ts            provider-neutral domain types
src/jwks.ts             JWKS verify + claim extraction (auth domain logic)
src/http/               compose (middleware chain), cors, sse
src/middleware/         auth (Bearer→verify), rateLimit, usageLimit
src/routes/             chat (SSE turn), health (/healthz, /readyz)
src/guardrails/         input (validation/pre-screen), output (tool allowlist)
src/llm/                provider interface, registry (tiers), tools, anthropic (SDK-isolated), system.md
src/telemetry/          store (Bun.sql writer + token aggregates), metrics (Prometheus + /metrics)
src/db/                 migrate.ts + migrations/*.sql
grafana/                Prometheus scrape example + importable Grafana dashboard
test/                   bun:test specs (start with auth)
```

## Working here

- **Install / run:** `bun install`; `bun run dev` (watch) or `bun run start`. Copy `.env.example` →
  `.env` first.
- **Local stack:** `docker compose -f docker/docker-compose.yml up -d` starts Postgres on host port
  **55432** (project-scoped so it won't clash with a local 5432), plus Prometheus (**59090**, scrapes
  the host-run app's metrics port **9464**) and Grafana (**3001**, no login, dashboard provisioned —
  see `grafana/README.md`).
  Then `bun run migrate` applies `src/db/migrations/*.sql` (idempotent).
  DB URL: `postgres://netbird:netbird@localhost:55432/netbird_assistant`.
- **Prod:** `docker compose -f docker/docker-compose.prod.yml up -d` runs the app (which migrates on
  boot), Postgres, node-exporter, and Prometheus (ships metrics to Grafana Cloud). See the file header.
- **Typecheck:** `bun run typecheck`. **Tests:** `bun test`.
- **DB integration tests** are skipped unless `TEST_DATABASE_URL` is set, and they `TRUNCATE
  llm_usage` — point them at the throwaway DB the dev compose creates, never at the dev one:
  `TEST_DATABASE_URL=postgres://netbird:netbird@localhost:55432/netbird_assistant_test bun test`.
  On a volume created before that DB existed:
  `docker exec netbird-assistant-dev-db psql -U netbird -d postgres -c 'CREATE DATABASE netbird_assistant_test OWNER netbird'`.
- **Integration tests** (telemetry, usage limit) are gated on `TEST_DATABASE_URL` and skipped without
  it: `TEST_DATABASE_URL=postgres://netbird:netbird@localhost:55432/netbird_assistant bun test`.
- **When you finish a nontrivial change,** verify it end-to-end (the `verify` skill), not just
  typecheck — drive the affected route and observe behavior.

## What's here

Auth (JWKS), token-usage telemetry + the usage limit, the Anthropic adapter + streamed chat, guardrails
(including the optional fast-tier classifier), rate limiting, and Prometheus metrics (`/metrics` on its
own unpublished port + the Grafana dashboard under `grafana/`). Tests cover each; run `bun test`.

The tool set spans account reads, the docs (server-run), `open_page`, and the control-center `cc_*`
canvas tools — the drafting half of the assistant, executed by the dashboard.

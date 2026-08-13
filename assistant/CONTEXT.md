# CONTEXT

Background and rationale for the NetBird AI Assistant server. For the build plan and module map, see
[PLAN.md](./PLAN.md); for how to work in this repo, see [AGENTS.md](./AGENTS.md).

## What this is

A standalone HTTP service that lets a NetBird user chat with an AI assistant about — and act on —
their NetBird network. It is deliberately **not** part of the management server and has **no network
path to it**.

## The three systems

1. **NetBird management** (`../openzro/management`, Go) — the existing backend. Owns the REST API
   (peers, groups, policies, routes, DNS, users, setup keys, events, …) and validates JWTs via JWKS.
   We do **not** modify it and we do **not** call it.
2. **This assistant server** (Bun/TS) — validates the same JWTs, drives Anthropic models, streams
   responses, records token-usage telemetry. Stateless.
3. **The caller** (e.g. the dashboard) — holds the conversation transcript, sends prompts + the
   user's JWT to this server, and **executes management tool calls itself** using that same JWT
   (rendering results, gating mutations behind confirmation). This service defines the HTTP API
   contract; it serves no UI, but it does define the inline-component contract the UI renders.

Not every tool runs in the caller. Tools carry a `runtime`: **client** tools (the management API)
run in the caller as above; **server** tools run in this service because they need no user
credentials — `search_docs`/`fetch_doc` read only public documentation, and `render_component`
only validates + emits UI. The service executes those inline and loops the model itself.

## Why this shape

The assistant follows the "augmented LLM + client-side tool execution" pattern from Anthropic's
[Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents). Two
consequences drove the design:

- **No path to management.** Because management tools run in the caller (with the user's JWT), the
  assistant needs no credentials, no RBAC logic, and no network route to management. Its only trust
  relationship with NetBird is verifying JWTs. The server-executed tools don't change this: docs are
  public, and component rendering is local validation — neither touches management.
- **Blast radius = the user's own permissions.** Every tool call executes with the user's JWT, so the
  model can never do anything the user isn't already allowed to do — management's existing RBAC still
  enforces every action.

## Why stateless (and why that's not slower)

The Anthropic Messages API is itself stateless — the full `messages[]` is re-processed every turn no
matter where it's stored. So server-side sessions would save **no** tokens and **no** model latency;
they'd only shave a few KB off the browser→server payload while adding a shared-store round-trip and
a session-affinity requirement. Instead the caller holds the transcript and re-sends it each turn,
and **prompt caching** (`cache_control`) makes the resent history bill at ~0.1×. Result: any instance
serves any request, no sticky sessions, clean horizontal scale.

## Why Bun

The workload is I/O-bound on the Anthropic stream, so the runtime is not the speed lever (streaming,
prompt caching, model choice, and autoscaling are). Bun was chosen for native TypeScript, fast cold
starts (good for autoscaling), and first-class native primitives we actually use: `Bun.serve` routing
and `Bun.sql` for Postgres. Trade-off accepted: no framework (a ~30-line `compose()` replaces
`app.use()`), and no native migrations (a tiny SQL-file runner instead).

## Usage tracking is a first-class feature

The core requirement is **usage per user and per account**, with guardrails. Every model call writes
one telemetry row with token counts and the model/provider (`src/telemetry/store.ts`).
`middleware/usageLimit.ts` reads the running token aggregates and rejects (402) before a call once a
daily/monthly ceiling is hit. This is a **usage limit** — a token ceiling on whichever API key backs
the provider, so it works self-hosted (bring-your-own-key) or hosted. It is distinct from rate
limiting, which bounds burst (requests/minute). Token counts come straight from the model response;
the server records those, not a dollar amount.

## LLM layer

The app is provider-neutral: it depends only on the `LlmProvider` interface and neutral domain types,
never on the vendor SDK (that lives in `src/llm/anthropic.ts`). Two config-selected **tiers** each pick
a model: a **main** model for the agentic chat turn, and a **fast** model for the optional guardrail
classifier.

## Documentation, answered live

How-to / concept / troubleshooting questions are answered from the **public docs**, not from model
memory. `search_docs` ranks a catalog built from the live doc sitemaps; `fetch_doc` reads the page —
preferring the **raw MDX source on GitHub** (clean text) and falling back to scraping the rendered
page for generated sections. Because these run server-side and read only public URLs, they need no
JWT and add no management exposure (host-allowlisted as an SSRF guard). Nothing is hardcoded: the
catalog rebuilds from the live sitemap on a TTL, so new or renamed pages appear automatically.

## Enforced interactivity

The dashboard is highly interactive — inline components (e.g. a preview of a pending change),
suggested questions, and clickable quick replies. The design principle is **enforcement, not trust**:

- **Components** are produced by a `render_component` **tool**, not free-form text. The provider
  enforces the input schema, the server then validates it against a zod registry, and on failure the
  model gets an error and retries — so a malformed component can never reach the UI. Data-heavy
  components (tables) can also render straight from tool results the dashboard already holds, keeping
  the model out of the loop entirely.
- **Clarifying questions** are an `ask_user` **tool** (`src/ui/ask.ts`), validated the same way. It's
  the only tool that *ends the turn*: the question goes out as a `question` event and the stream
  closes, because the model is waiting on an answer. `single_select` vs `multi_select` is decided by
  whether the answers can co-occur in reality, not by how the card looks.
- **Suggestions** come from a cheap fast-tier pass *after* the answer, so the main model's reply
  stays clean and they cost little. The pass also restates the assistant's own question, which titles
  the card its quick replies are shown in.
- **Model selection** is constrained to a server-side allowlist; the browser can request a model but
  never an arbitrary or more expensive one than the operator allows.

## Privacy: the model never sees real data

A hard requirement: the assistant should be able to reason about the user's network **without ever
learning its real identifiers**. So the caller **pseudonymizes** every management tool result before
it goes to the server/model — real values become type-preserving, identity-hiding placeholders
(`peer_1`, `ip_3`, `email_2`, `group_4`). The model keeps enough to be useful (kinds, structure,
status, counts) but never the identity; it echoes placeholders back, and the caller restores them for
display and maps them to real ids when executing a follow-up call.

The redaction happens **in the caller** by necessity — it's the only place with both the real data and
the user's trust. `src/privacy/redaction.ts` is the shared, OpenAPI-grounded contract plus a reference
implementation, so the frontend redacts/restores exactly as specified. It is an **allowlist**: each
resource lists the fields that may leave (verbatim or as a placeholder) and **everything else is
dropped by default** — a field the API adds tomorrow can't leak by omission (a denylist would). Secrets
(setup-key values, passwords) simply aren't on the list. Because the server holds no real data and runs
no redaction on it, this strengthens rather than complicates the "no path to management" posture.

The caller pseudonymizes **what the user types**, too, and into the same token namespace as the data —
names it recognises from the loaded lists, plus any address, CIDR or email by pattern. That's what makes
"where is 100.84.175.167?" answerable: the model gets `{IP_7}`, and `{IP_7}` is the token that peer's
redacted `ip` field carries, so matching one against the other is an ordinary lookup.

Where the caller can already say *which* resource a typed value belongs to, it does, as a line on the
turn: `Identifiers in this message: {DNS_1} is the hostname of peer {PEER_3}`. Both sides are tokens, so
it discloses nothing new — it just saves the model from rediscovering a join the dashboard had in hand.

As a backstop, the server also scrubs structural PII (emails, IPs, CIDRs) from user-typed text before
the model call (`guardrails/pii.ts`) — defense-in-depth for the rare value the frontend didn't
tokenize. It's reversible (one in-memory vault per request, restored on the way out) and conservative
(doc URLs survive), and it mints a deliberately separate `{REDACTED_IP_1}` namespace so the two
rewriters can never touch each other's tokens. That also means its tokens are opaque to *matching* —
they carry no relation to the account data — which is why recognising identifiers has to happen in the
caller; and it can't catch resource *names* at all.

Because the public documentation/API tools return the same content for everyone, their results are
cached in a **shared, cross-customer** TTL cache (`llm/serverToolCache.ts`). This is safe precisely
because those tools carry no account data — an allowlist keeps per-user management results (which never
reach this server anyway) out of it.

## Integration seams (verified against the real repos)

- **JWT:** management validates via `jose`-equivalent JWKS logic in
  `management/server/auth/jwt/validator.go` (keys by `kid`, RSA + EC, `Cache-Control: max-age`,
  `iss`/`aud`/`exp`/`nbf` + future-`iat` reject) and extracts identity in `extractor.go`
  (`sub` for user; namespaced `<audience>/wt_account_id` for account/tenant). We replicate this
  exactly in `src/jwks.ts`.

## Status

Implemented and tested: auth (JWKS + future-`iat` reject), token-usage telemetry + the usage limit,
the Anthropic adapter + streaming chat route, guardrails, rate limiting, and Prometheus metrics
(`/metrics` + Grafana dashboard). Also: server-executed **doc tools** (search + fetch with the
internal model loop), the **model selector** (`GET /v1/models` + validated request `model`),
**suggestion chips** (fast-tier pass + `GET /v1/suggestions`), the enforced **inline-component**
contract (`render_component` + `src/ui/components.ts`), and **tappable clarifying questions**
(`ask_user` + `src/ui/ask.ts`).

The remaining work is client-side, in the dashboard: management tool executors, the Markdown +
component renderers, and the suggestion/model-selector UI.

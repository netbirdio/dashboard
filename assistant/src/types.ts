/**
 * Shared, provider-neutral types. The wire contract is ours; each LLM provider
 * translates to/from these in src/llm/anthropic.ts.
 */

// ── LLM domain model (provider-neutral) ─────────────────────────────────────

/** A single content block within a message. */
export type LlmContentBlock =
  | { type: "text"; text: string }
  /**
   * The model's own reasoning. Carried through verbatim, signature included:
   * Anthropic rejects a tool loop whose assistant turn dropped or altered the
   * thinking block that preceded the tool call.
   */
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean };

/** A conversation message. `content` may be a bare string (convenience) or blocks. */
export interface LlmMessage {
  role: "user" | "assistant";
  content: string | LlmContentBlock[];
}

/** Wire alias: what the caller sends and re-sends each turn. */
export type ChatMessage = LlmMessage;

/** A tool the model may call. Provider adapters convert this to their own format. */
export interface LlmTool {
  name: string;
  description: string;
  /** JSON Schema for the tool input. */
  inputSchema: Record<string, unknown>;
}

/** Token usage for a single model call, normalized across providers. */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/**
 * Streamed event from a provider during a chat turn. Deltas only — tool_use
 * blocks arrive whole in `LlmResult` (see `LlmStream.final`), because a partial
 * tool input is not something a consumer can do anything with.
 */
export type LlmStreamEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string };

/** The completed result of a chat turn. */
export interface LlmResult {
  content: LlmContentBlock[];
  stopReason: string | null;
  usage: Usage;
  /** The concrete model id that produced this (for cost attribution). */
  model: string;
}

// ── Auth / request context ───────────────────────────────────────────────────

/** The authenticated principal extracted from a validated JWT. */
export interface Principal {
  /** User id — from AUTH_USER_ID_CLAIM (default `sub`). */
  userId: string;
  /** Account / tenant id — from the namespaced `<audience>/wt_account_id` claim. */
  accountId: string;
}

/** Per-request context threaded through the middleware chain. */
export interface RequestCtx {
  requestId: string;
  principal: Principal;
  /** monotonic start time (ms) for latency accounting. */
  startedAt: number;
}

// ── Model tiers & telemetry ──────────────────────────────────────────────────

/** Which model tier produced a given unit of work. */
export type ModelTier = "main" | "fast";

/** Which LLM provider backs a tier. */
export type ProviderName = "anthropic";

/** The kind of model call, for cost attribution. */
export type Task = "chat" | "guardrail" | "suggestions";

/** One row of telemetry — a single model call, with its token usage. */
export interface TelemetryRow {
  requestId: string;
  /** Groups every call of one chat together (cost per session). */
  conversationId?: string;
  accountId: string;
  userId: string;
  provider: ProviderName;
  model: string;
  task: Task;
  usage: Usage;
  latencyMs: number;
  stopReason: string | null;
  toolCallsRequested: number;
  createdAt: Date;
}

/** The request body for POST /v1/chat. */
export interface ChatRequest {
  messages: ChatMessage[];
  /** Optional client-provided conversation id, for telemetry correlation only. */
  conversationId?: string;
  /** Optional model id; must be in the selectable allowlist (see llm/models.ts). */
  model?: string;
}

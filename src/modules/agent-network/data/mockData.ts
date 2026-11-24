// Mock data for the Agent Network section. No backend wired up yet.
// All numbers, IDs, and text are static placeholders for click-through.

import type { APIAgentNetworkAccessLog } from "@/modules/agent-network/agentAccessLogApi";

// AIProviderId is the union of catalog provider ids. The canonical catalog
// (with names, default hosts, brand colors, and models) lives on the
// management server and is fetched via useProviderCatalog().
export type AIProviderId =
  | "openai_api"
  | "anthropic_api"
  | "azure_openai_api"
  | "bedrock_api"
  | "vertex_ai_api"
  | "mistral_api"
  | "kimi_api"
  | "litellm_proxy"
  | "agentgateway"
  | "portkey"
  | "bifrost"
  | "cloudflare_ai_gateway"
  | "vercel_ai_gateway"
  | "openrouter"
  | "vllm"
  | "custom";

export type AIProviderStatus = "active" | "warning" | "disabled";

export type AgentPeer = {
  id: string;
  name: string;
  ip: string;
  region: string;
  online: boolean;
};

export const MOCK_PEERS: AgentPeer[] = [
  { id: "peer_us_east_1", name: "proxy-us-east-1", ip: "100.64.10.21", region: "us-east-1", online: true },
  { id: "peer_eu_central_1", name: "proxy-eu-central-1", ip: "100.64.10.42", region: "eu-central-1", online: true },
  { id: "peer_ap_southeast_1", name: "proxy-ap-southeast-1", ip: "100.64.10.71", region: "ap-southeast-1", online: true },
  { id: "peer_dev_lab", name: "dev-lab-mac", ip: "100.64.20.5", region: "office", online: false },
];

export type ProviderModel = {
  id: string;
  inputPer1k: number;
  outputPer1k: number;
  // Optional prompt-cache rates (USD per 1k tokens). undefined means
  // "inherit NetBird's default rate for this model" — the backend folds
  // the default in at synthesis time; an explicit 0 means "no discount,
  // bill this cache bucket at the input rate". Keep undefined distinct
  // from 0 when round-tripping.
  // OpenAI shape: cached prompt tokens (a subset of input tokens).
  cachedInputPer1k?: number;
  // Anthropic shape: the two additive cache buckets (read ≈0.1x input,
  // creation ≈1.25x input).
  cacheReadPer1k?: number;
  cacheCreationPer1k?: number;
};

export type AIProvider = {
  id: string;
  providerId: AIProviderId;
  name: string;
  upstreamUrl: string;
  // extraValues holds operator-typed values for catalog-declared
  // extra headers (e.g. {"x-portkey-config": "pc-..."}). Stamped on
  // every upstream request by the proxy. Keys are wire header names.
  extraValues?: Record<string, string>;
  // identityHeaderUserId / identityHeaderGroups carry the operator's
  // wire-header-name choice for HeaderPair-style identity injection
  // on catalog entries that mark the shape Customizable (Bifrost
  // today). Empty value disables stamping for that dimension. The
  // catalog default is shown as a placeholder in the modal but only
  // the value stored here lands on the wire.
  identityHeaderUserId?: string;
  identityHeaderGroups?: string;
  // Skip TLS certificate verification on upstream requests — for custom
  // providers using self-signed certs. Off by default.
  skipTlsVerification?: boolean;
  // Disable identity metadata injection (caller user + authorizing group) on
  // upstream requests, e.g. AWS Bedrock cost-allocation. Off by default.
  metadataDisabled?: boolean;
  status: AIProviderStatus;
  models: ProviderModel[];
  allowedGroups: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  authMethod: "sso" | "bearer" | "header";
  hasApiKey: boolean;
  promptRetentionDays: number;
  promptRedactionLevel: "none" | "light" | "strict";
  monthlyBudgetSoftUsd: number;
  monthlyBudgetHardUsd: number;
  currentMonthSpendUsd: number;
  last7dSpendUsd: number;
  requestsLast7d: number;
  topModel: string;
  topUser: string;
  p50LatencyMs: number;
  p95LatencyMs: number;
  denyRatePct: number;
  enabled: boolean;
};

export const MOCK_PROVIDERS: AIProvider[] = [
  {
    id: "svc_openai_prod",
    providerId: "openai_api",
    name: "OpenAI API",
    upstreamUrl: "https://api.openai.com",
    status: "active",
    models: [
      { id: "gpt-4o", inputPer1k: 0.005, outputPer1k: 0.015 },
      { id: "gpt-4o-mini", inputPer1k: 0.00015, outputPer1k: 0.0006 },
      { id: "text-embedding-3-large", inputPer1k: 0.00013, outputPer1k: 0 },
    ],
    allowedGroups: ["engineering", "data-science"],
    allowedCountries: [],
    blockedCountries: ["RU", "KP"],
    authMethod: "sso",
    hasApiKey: true,
    promptRetentionDays: 30,
    promptRedactionLevel: "strict",
    monthlyBudgetSoftUsd: 1500,
    monthlyBudgetHardUsd: 2000,
    currentMonthSpendUsd: 1147.32,
    last7dSpendUsd: 312.55,
    requestsLast7d: 18432,
    topModel: "gpt-4o-mini",
    topUser: "alice@acme.io",
    p50LatencyMs: 480,
    p95LatencyMs: 1820,
    denyRatePct: 0.4,
    enabled: true,
  },
  {
    id: "svc_anthropic_prod",
    providerId: "anthropic_api",
    name: "Anthropic API",
    upstreamUrl: "https://api.anthropic.com",
    status: "warning",
    models: [
      { id: "claude-sonnet-4-6", inputPer1k: 0.003, outputPer1k: 0.015 },
      { id: "claude-haiku-4-5", inputPer1k: 0.00025, outputPer1k: 0.00125 },
    ],
    allowedGroups: ["engineering", "support"],
    allowedCountries: [],
    blockedCountries: [],
    authMethod: "sso",
    hasApiKey: true,
    promptRetentionDays: 30,
    promptRedactionLevel: "light",
    monthlyBudgetSoftUsd: 800,
    monthlyBudgetHardUsd: 1000,
    currentMonthSpendUsd: 824.11,
    last7dSpendUsd: 198.04,
    requestsLast7d: 7211,
    topModel: "claude-sonnet-4-6",
    topUser: "bob@acme.io",
    p50LatencyMs: 612,
    p95LatencyMs: 2410,
    denyRatePct: 1.8,
    enabled: true,
  },
];

export type AIAccessLogDecision = "allow" | "deny";

export type AIAccessLogEntry = {
  id: string;
  serviceId: string;
  providerId: AIProviderId;
  // Raw vendor label the request parser stamped ("openai", "anthropic"),
  // before it was normalised into a catalog id. Empty when the request never
  // got far enough to be recognised as an LLM call — providerId collapses that
  // case into "custom", so only this field can tell the two apart.
  providerVendor?: string;
  // Config-row id of the provider the router actually selected
  // (llm.resolved_provider_id metadata). Empty for legacy entries
  // and non-agent-network requests where the router didn't run.
  resolvedProviderId: string;
  // Provider-side session id grouping related calls. A single user can make
  // several separate requests that the provider ties to one session
  // (llm.session_id metadata). Empty when the provider didn't return one.
  sessionId: string;
  timestamp: string;
  user: string;
  userId: string;
  userGroups: string[];
  sourceIp: string;
  countryCode: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  // Prompt-cache buckets: read/write token counts and the cache share of costUsd. Optional — absent on older management servers.
  cachedInputTokens?: number;
  cacheCreationTokens?: number;
  costUsd: number;
  cacheCostUsd?: number;
  // Per-bucket cost breakdown. Undefined (not 0) when the server predates the
  // breakdown, so the UI can tell "no split available" from "split is zero".
  inputCostUsd?: number;
  cachedInputCostUsd?: number;
  cacheCreationCostUsd?: number;
  outputCostUsd?: number;
  durationMs: number;
  decision: AIAccessLogDecision;
  denyReason?: string;
  policyName: string;
  // Id of the agent-network policy the router selected for this request
  // (llm.selected_policy_id metadata). Empty when no policy matched
  // (e.g. denied before routing).
  selectedPolicyId: string;
  promptPreview: string;
  prompt: string;
  completion: string;
  stream: boolean;
  status: number;
  // HTTP method and request path the agent called (e.g. "POST" /
  // "/v1/responses"). Surfaced in the expanded row so non-completion
  // calls like "GET /v1/models" are self-explanatory.
  method: string;
  path: string;
  // Error attribution for failed requests (status >= 400). Optional —
  // absent on successful rows and on older management servers.
  errorSource?: AIAccessLogErrorSource;
  // Id of the policy (llm_policy.* deny) or global limit (llm_account.* deny)
  // that blocked the request.
  blockedBy?: string;
  // Free-text explanation for the admin, e.g. "Destination Not Allowed: dial
  // tcp 10.255.255.1:443: direct upstream address is not allowed".
  errorDetail?: string;
};

// AIAccessLogErrorSource says who failed a request: the upstream provider,
// the NetBird proxy reaching it, a NetBird policy/limit, or the proxy's own
// authentication.
export type AIAccessLogErrorSource = "provider" | "proxy" | "policy" | "auth";

// AIAccessLogSession is a session-grouped view of access-log entries: all
// requests sharing a provider session id (or a single session-less request,
// keyed by its own id) folded into one summary plus its ordered entries.
export type AIAccessLogSession = {
  // Stable row id for table expansion: the session id, or the singleton
  // request's id when the session id is empty. Mirrors the backend group key.
  id: string;
  sessionId: string; // empty for a session-less (singleton) request
  user: string;
  userId: string;
  userGroups: string[];
  startedAt: string;
  endedAt: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  cacheCreationTokens?: number;
  costUsd: number;
  cacheCostUsd?: number;
  // Per-bucket cost breakdown. Undefined (not 0) when the server predates the
  // breakdown, so the UI can tell "no split available" from "split is zero".
  inputCostUsd?: number;
  cachedInputCostUsd?: number;
  cacheCreationCostUsd?: number;
  outputCostUsd?: number;
  providers: string[]; // distinct vendor ids seen in the session
  models: string[]; // distinct models seen in the session
  decision: AIAccessLogDecision;
  entries: AIAccessLogEntry[];
};

// Short labels for the proxy's llm_policy.reason deny codes. Keyed by the bare
// reason (the prefix is stripped before lookup) so both forms the proxy emits
// resolve — bare ("model_not_routable") and prefixed deny codes
// ("llm_policy.token_cap_exceeded", "llm_account.budget_cap_exceeded").
const DENY_REASON_LABELS: Record<string, string> = {
  model_not_routable: "Model not available",
  no_authorised_provider: "No authorized provider",
  model_blocked: "Model not allowed",
  cap_exceeded: "Limit exceeded",
  token_cap_exceeded: "Token limit exceeded",
  budget_cap_exceeded: "Budget limit exceeded",
};

// formatDenyReason turns a proxy llm_policy.reason value into short, concise
// human text. Account-scoped caps (llm_account.*) are prefixed with "Account".
// Unknown codes fall back to a humanised version of the raw value.
export function formatDenyReason(reason: string | undefined): string {
  if (!reason) return "";
  const isAccount = reason.startsWith("llm_account.");
  const bare = reason.replace(/^llm_(policy|account)\./, "");
  const base =
    DENY_REASON_LABELS[bare] ??
    bare.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return isAccount ? `Account ${base.toLowerCase()}` : base;
}

export const ERROR_SOURCE_INFO: Record<
  AIAccessLogErrorSource,
  { label: string; description: string }
> = {
  provider: {
    label: "Provider error",
    description:
      "The LLM provider answered with this error, e.g. an invalid API key, a quota or a rejected request.",
  },
  proxy: {
    label: "Proxy error",
    description:
      "The NetBird proxy could not reach the provider, e.g. a timeout, a refused connection, a disconnected peer or a blocked address.",
  },
  policy: {
    label: "Policy",
    description:
      "A NetBird policy, limit, guardrail or routing rule denied the request.",
  },
  auth: {
    label: "Authentication",
    description:
      "The NetBird proxy rejected the request's credentials before it reached the provider.",
  },
};

// formatErrorReason is the short REASON-column text for a failed request with
// error attribution. Undefined when the entry has none (successful rows, older
// management servers), so callers keep their existing text.
export function formatErrorReason(entry: AIAccessLogEntry): string | undefined {
  if (!entry.errorSource || entry.status < 400) return undefined;
  switch (entry.errorSource) {
    case "policy":
      return formatDenyReason(entry.denyReason) || "Denied by policy";
    case "provider":
      return `Provider error (${entry.status})`;
    case "proxy": {
      const title = entry.errorDetail?.split(":")[0].trim();
      return title ? `Proxy error: ${title}` : "Proxy error";
    }
    case "auth":
      return "Authentication";
  }
}

// sessionReasonEntry picks the entry whose reason stands for a session: a
// successful allowed request (so a session that succeeded shows the policy that
// authorised it), then any allowed request, then the first one. A deny reason
// only shows when every request was denied.
export function sessionReasonEntry(
  entries: AIAccessLogEntry[],
): AIAccessLogEntry | undefined {
  return (
    entries.find((e) => e.decision === "allow" && e.status < 400) ??
    entries.find((e) => e.decision === "allow") ??
    entries[0]
  );
}

export type BlockedByTarget = {
  kind: "policy" | "global_limit";
  id: string;
  // The current name, or the id when the policy / limit has since been deleted.
  name: string;
  href: string;
};

// resolveBlockedBy names the policy or global limit that blocked a request.
// The deny reason's prefix says which: llm_policy.* is an agent-network policy,
// llm_account.* an account global limit.
export function resolveBlockedBy(
  entry: AIAccessLogEntry,
  policies: AgentPolicy[] | undefined,
  budgetRules: AgentBudgetRule[] | undefined,
): BlockedByTarget | undefined {
  const id = entry.blockedBy;
  if (!id) return undefined;
  if (entry.denyReason?.startsWith("llm_account.")) {
    const name = budgetRules?.find((r) => r.id === id)?.name ?? id;
    return {
      kind: "global_limit",
      id,
      name,
      href: "/agent-network/configuration?tab=budget-settings",
    };
  }
  const name = policies?.find((p) => p.id === id)?.name ?? id;
  return {
    kind: "policy",
    id,
    name,
    href: `/agent-network/policies?search=${encodeURIComponent(name)}`,
  };
}

// Failed access-log rows, one per kind of error attribution, in the shape the
// management API returns. Ids match the Storybook fixtures.
export const MOCK_ERROR_ACCESS_LOGS: APIAgentNetworkAccessLog[] = [
  {
    id: "anlog-err-policy",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:10:00Z",
    status_code: 403,
    duration_ms: 4,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    method: "POST",
    path: "/v1/responses",
    provider: "openai",
    model: "gpt-5.5",
    decision: "deny",
    deny_reason: "llm_policy.budget_cap_exceeded",
    error_source: "policy",
    blocked_by: "anpol-contractors",
    error_detail:
      "user budget cap exhausted on policy anpol-contractors (used $0.0002 of $0.0001)",
  },
  {
    id: "anlog-err-limit",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:08:00Z",
    status_code: 403,
    duration_ms: 3,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    method: "POST",
    path: "/v1/chat/completions",
    provider: "openai",
    model: "gpt-4o",
    decision: "deny",
    deny_reason: "llm_account.token_cap_exceeded",
    error_source: "policy",
    blocked_by: "anb-contractors",
    error_detail:
      "user token cap exhausted on account limit anb-contractors (used 512000 of 500000)",
  },
  {
    id: "anlog-err-provider",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:06:00Z",
    status_code: 401,
    duration_ms: 210,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    method: "POST",
    path: "/v1/messages",
    provider: "anthropic",
    model: "claude-sonnet-5",
    decision: "allow",
    selected_policy_id: "anpol-eng",
    error_source: "provider",
  },
  {
    id: "anlog-err-proxy",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:04:00Z",
    status_code: 502,
    duration_ms: 12,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    method: "POST",
    path: "/v1/chat/completions",
    provider: "mistral",
    model: "mistral-large-latest",
    decision: "allow",
    selected_policy_id: "anpol-eng",
    error_source: "proxy",
    error_detail:
      "Destination Not Allowed: dial tcp 10.255.255.1:443: direct upstream address is not allowed",
  },
  {
    // Rejected by the proxy's own authentication before it was parsed as an
    // LLM call, so no provider, model or policy decision is recorded.
    id: "anlog-err-auth",
    service_id: "svc-agent-network",
    timestamp: "2026-10-08T12:03:00Z",
    status_code: 401,
    duration_ms: 2,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
    method: "POST",
    path: "/v1/chat/completions",
    error_source: "auth",
  },
];

export const MOCK_GROUPS = [
  { id: "engineering", name: "Engineering" },
  { id: "data-science", name: "Data Science" },
  { id: "support", name: "Support" },
  { id: "marketing", name: "Marketing" },
  { id: "finance", name: "Finance" },
];

export type AgentGuardrailChecks = {
  model_allowlist: {
    enabled: boolean;
    models: string[];
  };
  prompt_capture: {
    enabled: boolean;
    redactPii: boolean;
  };
};

export type AgentGuardrail = {
  id: string;
  name: string;
  description: string;
  checks: AgentGuardrailChecks;
};

export const EMPTY_GUARDRAIL_CHECKS: AgentGuardrailChecks = {
  model_allowlist: { enabled: false, models: [] },
  prompt_capture: { enabled: false, redactPii: true },
};

// PolicyTokenLimit and PolicyBudgetLimit live on the policy itself
// (Limits tab in the policy modal). Each cap resets on an aligned
// window of `windowSeconds` seconds (minimum 60 — one minute).
// group_cap is applied to each source group independently — every
// group in the policy's source_groups gets its own bucket of
// group_cap tokens (or USD). user_cap applies independently to each
// individual user. A zero cap means uncapped.
export type PolicyTokenLimit = {
  enabled: boolean;
  groupCap: number;
  userCap: number;
  windowSeconds: number;
};

export type PolicyBudgetLimit = {
  enabled: boolean;
  groupCapUsd: number;
  userCapUsd: number;
  windowSeconds: number;
};

export type PolicyLimits = {
  tokenLimit: PolicyTokenLimit;
  budgetLimit: PolicyBudgetLimit;
};

// 30 days expressed in seconds; the historic default for both limit
// halves was 720h, which lands on the same calendar bucket.
const DEFAULT_LIMIT_WINDOW_SECONDS = 2_592_000;

export const EMPTY_POLICY_LIMITS: PolicyLimits = {
  tokenLimit: { enabled: false, groupCap: 0, userCap: 0, windowSeconds: DEFAULT_LIMIT_WINDOW_SECONDS },
  budgetLimit: { enabled: false, groupCapUsd: 0, userCapUsd: 0, windowSeconds: DEFAULT_LIMIT_WINDOW_SECONDS },
};

// BudgetWindow mirrors the backend enum: how a budget period rolls.
// Reused by guardrail budget config.
export type BudgetWindow = "calendar_month" | "rolling_30d";

// AttributionMode mirrors the backend enum: how the proxy picks a
// group-source policy to debit when multiple match. The dashboard does
// not expose this knob in v1 — the backend defaults to "largest_cap"
// (the policy with the largest budget cap from its attached guardrails
// wins). The type stays so future surfaces can reuse it.
export type AttributionMode = "priority" | "largest_cap" | "all_matching";

// AgentPolicy carries authorisation only (who can call which provider
// under which guardrails). Budget lives on the attached Guardrails, not
// on the Policy itself.
export type AgentPolicy = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sourceGroups: string[];
  destinationProviderIds: string[];
  guardrailIds: string[];
  limits: PolicyLimits;
};

// AgentBudgetRule is an account-level limit that runs alongside policy
// limits. Empty target_groups + empty target_users means the rule
// applies account-wide; otherwise it scopes to the listed groups/users.
export type AgentBudgetRule = {
  id: string;
  name: string;
  enabled: boolean;
  targetGroups: string[];
  targetUsers: string[];
  limits: PolicyLimits;
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_BUDGET_RULE: Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  enabled: true,
  targetGroups: [],
  targetUsers: [],
  limits: EMPTY_POLICY_LIMITS,
};

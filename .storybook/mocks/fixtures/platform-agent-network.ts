import { GROUP, USER } from "./ids";
import type { Handler, HandlerContext } from "./index";

const created = "2026-09-01T09:00:00Z";
const updated = "2026-10-02T14:30:00Z";

const model = (
  id: string,
  label: string,
  input: number,
  output: number,
  extra: object = {},
) => ({
  id,
  label,
  input_per_1k: input,
  output_per_1k: output,
  context_window: 200000,
  ...extra,
});

/* The provider catalog the management server ships; one entry per kind and per modal variant
   (extra headers, header-pair and JSON identity injection, Bedrock's fixed mappings). */
const catalog = [
  {
    id: "openai_api",
    name: "OpenAI",
    description: "GPT models through the OpenAI API.",
    default_host: "api.openai.com",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#10a37f",
    kind: "provider",
    pricing_surfaces: ["openai"],
    models: [
      model("gpt-4o", "GPT-4o", 0.0025, 0.01, { cached_input_per_1k: 0.00125 }),
      model("gpt-4o-mini", "GPT-4o mini", 0.00015, 0.0006, {
        cached_input_per_1k: 0.000075,
      }),
      model("o3", "o3", 0.002, 0.008),
    ],
  },
  {
    id: "anthropic_api",
    name: "Anthropic",
    description: "Claude models through the Anthropic API.",
    default_host: "api.anthropic.com",
    auth_header_template: "x-api-key: {key}",
    default_content_type: "application/json",
    brand_color: "#d97757",
    kind: "provider",
    pricing_surfaces: ["anthropic"],
    models: [
      model("claude-sonnet-4-5", "Claude Sonnet 4.5", 0.003, 0.015, {
        cache_read_per_1k: 0.0003,
        cache_creation_per_1k: 0.00375,
      }),
      model("claude-haiku-4-5", "Claude Haiku 4.5", 0.001, 0.005, {
        cache_read_per_1k: 0.0001,
        cache_creation_per_1k: 0.00125,
      }),
    ],
  },
  {
    id: "azure_openai_api",
    name: "Azure OpenAI",
    description: "OpenAI models hosted in your Azure subscription.",
    default_host: "{resource}.openai.azure.com",
    auth_header_template: "api-key: {key}",
    default_content_type: "application/json",
    brand_color: "#0078d4",
    kind: "provider",
    pricing_surfaces: ["openai"],
    models: [model("gpt-4o", "GPT-4o", 0.0025, 0.01)],
  },
  {
    id: "bedrock_api",
    name: "AWS Bedrock",
    description: "Foundation models through Amazon Bedrock.",
    default_host: "bedrock-runtime.eu-central-1.amazonaws.com",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#01a88d",
    kind: "provider",
    pricing_surfaces: ["bedrock"],
    models: [
      model(
        "eu.anthropic.claude-sonnet-4-5-v1:0",
        "Claude Sonnet 4.5 (EU)",
        0.003,
        0.015,
      ),
    ],
  },
  {
    id: "vertex_ai_api",
    name: "Google Vertex AI",
    description: "Gemini models through Vertex AI.",
    default_host: "europe-west4-aiplatform.googleapis.com",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#4285f4",
    kind: "provider",
    models: [model("gemini-2.5-pro", "Gemini 2.5 Pro", 0.00125, 0.01)],
  },
  {
    id: "mistral_api",
    name: "Mistral",
    description: "Mistral models through La Plateforme.",
    default_host: "api.mistral.ai",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#fa520f",
    kind: "provider",
    models: [model("mistral-large-latest", "Mistral Large", 0.002, 0.006)],
  },
  {
    id: "litellm_proxy",
    name: "LiteLLM",
    description: "Self-hosted LiteLLM proxy in front of many providers.",
    default_host: "litellm.example.com",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#4f46e5",
    kind: "gateway",
    identity_injection: {
      header_pair: {
        customizable: false,
        end_user_id_header: "x-litellm-end-user-id",
        tags_header: "x-litellm-tags",
      },
    },
    models: [],
  },
  {
    id: "portkey",
    name: "Portkey",
    description: "Portkey AI gateway.",
    default_host: "api.portkey.ai",
    auth_header_template: "x-portkey-api-key: {key}",
    default_content_type: "application/json",
    brand_color: "#000000",
    kind: "gateway",
    extra_headers: [{ name: "x-portkey-config" }],
    identity_injection: {
      json_metadata: {
        customizable: false,
        header: "x-portkey-metadata",
        user_key: "_user",
        groups_key: "groups",
      },
    },
    models: [],
  },
  {
    id: "bifrost",
    name: "Bifrost",
    description: "Bifrost LLM gateway.",
    default_host: "bifrost.example.com",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#7c3aed",
    kind: "gateway",
    identity_injection: {
      header_pair: {
        customizable: true,
        end_user_id_header: "x-bf-dim-user",
        tags_header: "x-bf-dim-groups",
      },
    },
    models: [],
  },
  {
    id: "cloudflare_ai_gateway",
    name: "Cloudflare AI Gateway",
    description: "Cloudflare's AI Gateway.",
    default_host: "gateway.ai.cloudflare.com",
    auth_header_template: "cf-aig-authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#f38020",
    kind: "gateway",
    identity_injection: {
      json_metadata: {
        customizable: true,
        header: "cf-aig-metadata",
        user_key: "user",
        groups_key: "groups",
      },
    },
    models: [],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "One API for hundreds of models.",
    default_host: "openrouter.ai/api",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#6467f2",
    kind: "gateway",
    extra_headers: [{ name: "HTTP-Referer" }, { name: "X-OpenRouter-Title" }],
    models: [],
  },
  {
    id: "vllm",
    name: "vLLM",
    description: "Self-hosted OpenAI-compatible vLLM server.",
    default_host: "vllm.internal:8000",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#30a2ff",
    kind: "custom",
    models: [],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Any OpenAI-compatible endpoint.",
    default_host: "",
    auth_header_template: "Authorization: Bearer {key}",
    default_content_type: "application/json",
    brand_color: "#6b7280",
    kind: "custom",
    models: [],
  },
];

const apiModel = (
  id: string,
  input: number,
  output: number,
  extra: object = {},
) => ({
  id,
  input_per_1k: input,
  output_per_1k: output,
  ...extra,
});

/* One provider per modal variant; a disabled one, one with all models allowed, a long name. */
export const agentProviders = [
  {
    id: "anp-openai",
    provider_id: "openai_api",
    name: "OpenAI Production",
    upstream_url: "https://api.openai.com",
    models: [
      apiModel("gpt-4o", 0.0025, 0.01, { cached_input_per_1k: 0.00125 }),
      apiModel("gpt-4o-mini", 0.00015, 0.0006),
    ],
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-anthropic",
    provider_id: "anthropic_api",
    name: "Anthropic Claude",
    upstream_url: "https://api.anthropic.com",
    models: [
      apiModel("claude-sonnet-4-5", 0.003, 0.015, {
        cache_read_per_1k: 0.0003,
        cache_creation_per_1k: 0.00375,
      }),
      apiModel("claude-haiku-4-5", 0.001, 0.005),
    ],
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-azure",
    provider_id: "azure_openai_api",
    name: "Azure OpenAI (EU West)",
    upstream_url: "https://acme-eu.openai.azure.com",
    models: [apiModel("gpt-4o", 0.0025, 0.01)],
    enabled: false,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-bedrock",
    provider_id: "bedrock_api",
    name: "AWS Bedrock",
    upstream_url: "https://bedrock-runtime.eu-central-1.amazonaws.com",
    models: [apiModel("eu.anthropic.claude-sonnet-4-5-v1:0", 0.003, 0.015)],
    metadata_disabled: true,
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-litellm",
    provider_id: "litellm_proxy",
    name: "LiteLLM Gateway",
    upstream_url: "https://litellm.internal.acme.io",
    models: null,
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-bifrost",
    provider_id: "bifrost",
    name: "Bifrost",
    upstream_url: "https://bifrost.internal.acme.io",
    models: [],
    identity_header_user_id: "x-bf-dim-user",
    identity_header_groups: "x-bf-dim-team",
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anp-vllm",
    provider_id: "vllm",
    name: "Self-hosted vLLM cluster in the Frankfurt datacenter (GPU rack 4)",
    upstream_url: "https://vllm.fra.internal.acme.io:8443",
    models: [apiModel("meta-llama/Llama-3.3-70B-Instruct", 0, 0)],
    skip_tls_verification: true,
    enabled: true,
    created_at: created,
    updated_at: updated,
  },
];

const limits = (token: object | null, budget: object | null) => ({
  token_limit: {
    enabled: !!token,
    group_cap: 0,
    user_cap: 0,
    window_seconds: 86400,
    ...token,
  },
  budget_limit: {
    enabled: !!budget,
    group_cap_usd: 0,
    user_cap_usd: 0,
    window_seconds: 2592000,
    ...budget,
  },
});

export const agentGuardrails = [
  {
    id: "ang-strict",
    name: "Strict — Production",
    description: "Only approved models, prompts captured with PII redacted.",
    checks: {
      model_allowlist: {
        enabled: true,
        models: ["gpt-4o", "claude-sonnet-4-5"],
      },
      prompt_capture: { enabled: true, redact_pii: true },
    },
    created_at: created,
    updated_at: updated,
  },
  {
    id: "ang-capture",
    name: "Prompt capture",
    description: "",
    checks: {
      model_allowlist: { enabled: false, models: [] },
      prompt_capture: { enabled: true, redact_pii: false },
    },
    created_at: created,
    updated_at: updated,
  },
];

export const agentPolicies = [
  {
    id: "anpol-eng",
    name: "Engineering → Claude & OpenAI",
    description: "Developers and DevOps get the frontier models.",
    enabled: true,
    source_groups: [GROUP.developers, GROUP.devops],
    destination_provider_ids: ["anp-openai", "anp-anthropic"],
    guardrail_ids: ["ang-strict"],
    limits: limits(
      { user_cap: 2_000_000, group_cap: 20_000_000 },
      { user_cap_usd: 150, group_cap_usd: 2500 },
    ),
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anpol-contractors",
    name: "Contractors → Gateway",
    description: "",
    enabled: true,
    source_groups: [GROUP.contractors],
    destination_provider_ids: ["anp-litellm"],
    guardrail_ids: [],
    limits: limits(null, { user_cap_usd: 25, window_seconds: 604800 }),
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anpol-everyone",
    name: "Everyone → self-hosted models",
    description: "Free internal models for every office.",
    enabled: true,
    source_groups: [
      GROUP.all,
      GROUP.officeBerlin,
      GROUP.officeNewYork,
      GROUP.servers,
    ],
    destination_provider_ids: ["anp-vllm", "anp-bedrock", "anp-bifrost"],
    guardrail_ids: ["ang-strict", "ang-capture"],
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anpol-disabled",
    name: "Azure pilot",
    description: "Paused until the DPA is signed.",
    enabled: false,
    source_groups: [GROUP.databases],
    destination_provider_ids: ["anp-azure"],
    guardrail_ids: [],
    created_at: created,
    updated_at: updated,
  },
];

export const agentBudgetRules = [
  {
    id: "anb-account",
    name: "Account-wide monthly cap",
    enabled: true,
    target_groups: [GROUP.all],
    target_users: [],
    limits: limits(null, { group_cap_usd: 10000, user_cap_usd: 300 }),
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anb-contractors",
    name: "Contractor daily tokens",
    enabled: true,
    target_groups: [GROUP.contractors],
    target_users: [USER.developer],
    limits: limits({ user_cap: 500_000, group_cap: 2_000_000 }, null),
    created_at: created,
    updated_at: updated,
  },
  {
    id: "anb-disabled",
    name: "Holiday freeze",
    enabled: false,
    target_groups: null,
    target_users: [USER.admin],
    limits: limits({ user_cap: 1000 }, { user_cap_usd: 1 }),
    created_at: created,
    updated_at: updated,
  },
];

export const agentSettings = {
  endpoint: "acme.ai.eu.proxy.netbird.io",
  proxy_address: "eu.proxy.netbird.io",
  dedicated: false,
  attribution_mode: "priority",
  default_user_monthly_budget: 100,
  enable_log_collection: true,
  enable_prompt_collection: true,
  redact_pii: true,
  access_log_retention_days: 30,
  created_at: created,
  updated_at: updated,
};

/* What the endpoint answers before the account set Agent Network up. */
export const agentSettingsUnbootstrapped = {
  endpoint: "",
  proxy_address: "",
  dedicated: false,
  enable_log_collection: false,
  enable_prompt_collection: false,
  redact_pii: false,
};

export const agentConfig = {
  configured: true,
  endpoint: "https://acme.ai.eu.proxy.netbird.io",
  providers: [
    {
      name: "OpenAI Production",
      catalog_id: "openai_api",
      api_flavor: "openai",
      all_models_allowed: false,
      models: ["gpt-4o", "gpt-4o-mini"],
    },
    {
      name: "Anthropic Claude",
      catalog_id: "anthropic_api",
      api_flavor: "anthropic",
      all_models_allowed: false,
      models: ["claude-sonnet-4-5"],
    },
    {
      name: "LiteLLM Gateway",
      catalog_id: "litellm_proxy",
      api_flavor: "openai",
      all_models_allowed: true,
      models: [],
    },
  ],
};

export const agentConfigUnconfigured = {
  configured: false,
  endpoint: "",
  providers: [],
};

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-08T00:00:00Z");

/* Fourteen days of usage with a weekly rhythm, so the bars are visibly different but fixed. */
const usageBuckets = Array.from({ length: 15 }, (_, i) => {
  const weekday = (i + 3) % 7;
  const scale = weekday >= 5 ? 0.2 : 0.6 + ((i * 37) % 10) / 10;
  const input = Math.round(1_800_000 * scale);
  const output = Math.round(420_000 * scale);
  const cached = Math.round(600_000 * scale);
  const inputCost = +(input * 0.0000025).toFixed(2);
  const outputCost = +(output * 0.00001).toFixed(2);
  const cacheCost = +(cached * 0.0000003).toFixed(2);
  return {
    period_start: new Date(NOW - (14 - i) * DAY).toISOString().slice(0, 10),
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
    cached_input_tokens: cached,
    cache_creation_tokens: Math.round(cached / 6),
    cost_usd: +(inputCost + outputCost + cacheCost).toFixed(2),
    cache_cost_usd: cacheCost,
    input_cost_usd: inputCost,
    output_cost_usd: outputCost,
    cached_input_cost_usd: cacheCost,
    cache_creation_cost_usd: 0,
  };
});

const logTemplates = [
  {
    provider: "openai",
    model: "gpt-4o",
    resolved_provider_id: "anp-openai",
    user_id: USER.developer,
    group_ids: [GROUP.developers],
    decision: "allow",
    status_code: 200,
    prompt:
      "Refactor this Go handler to return early when the request body is empty.",
    completion: "Here's the refactored handler with an early return…",
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    resolved_provider_id: "anp-anthropic",
    user_id: USER.admin,
    group_ids: [GROUP.devops],
    decision: "allow",
    status_code: 200,
    stream: true,
    prompt: "Summarize the incident timeline from these logs.",
    completion: "At 09:14 UTC the primary database…",
  },
  {
    provider: "openai",
    model: "gpt-4o-mini",
    resolved_provider_id: "anp-openai",
    user_id: USER.auditor,
    group_ids: [GROUP.contractors],
    decision: "deny",
    deny_reason: "model_not_allowed",
    status_code: 403,
  },
  {
    provider: "litellm",
    model: "mistral-large-latest",
    resolved_provider_id: "anp-litellm",
    user_id: USER.developer,
    group_ids: [GROUP.contractors],
    decision: "deny",
    deny_reason: "budget_exceeded",
    status_code: 429,
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    resolved_provider_id: "anp-anthropic",
    user_id: USER.owner,
    group_ids: [GROUP.developers, GROUP.devops],
    decision: "allow",
    status_code: 200,
    prompt: "Write a unit test for the rate limiter.",
    completion: "func TestRateLimiter(t *testing.T) {…",
  },
  {
    provider: "vllm",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    resolved_provider_id: "anp-vllm",
    user_id: USER.admin,
    group_ids: [GROUP.all],
    decision: "allow",
    status_code: 502,
  },
];

const accessLogs = Array.from({ length: 18 }, (_, i) => {
  const t = logTemplates[i % logTemplates.length];
  const input = [1840, 12_400, 0, 0, 920, 3100][i % 6] + i * 13;
  const output = [610, 2200, 0, 0, 1480, 0][i % 6];
  return {
    id: `anlog-${String(i + 1).padStart(3, "0")}`,
    service_id: "svc-agent-network",
    timestamp: new Date(
      Date.parse("2026-10-08T11:55:00Z") - i * 23 * 60_000,
    ).toISOString(),
    status_code: t.status_code,
    duration_ms: [820, 4310, 12, 9, 1290, 30000][i % 6],
    input_tokens: input,
    output_tokens: output,
    total_tokens: input + output,
    cached_input_tokens: i % 3 === 0 ? 1024 : 0,
    cache_creation_tokens: i % 4 === 1 ? 2048 : 0,
    cost_usd: +(input * 0.0000025 + output * 0.00001).toFixed(4),
    cache_cost_usd: i % 3 === 0 ? 0.0003 : 0,
    input_cost_usd: +(input * 0.0000025).toFixed(4),
    output_cost_usd: +(output * 0.00001).toFixed(4),
    user_id: t.user_id,
    source_ip: `100.92.${14 + (i % 4)}.${21 + i}`,
    method: "POST",
    host: "acme.ai.eu.proxy.netbird.io",
    path: t.provider === "anthropic" ? "/v1/messages" : "/v1/chat/completions",
    provider: t.provider,
    model: t.model,
    resolved_provider_id: t.resolved_provider_id,
    session_id: `sess-${Math.floor(i / 3) + 1}`,
    selected_policy_id:
      t.decision === "allow" ? "anpol-eng" : "anpol-contractors",
    decision: t.decision,
    deny_reason: t.deny_reason,
    stream: t.stream ?? false,
    group_ids: t.group_ids,
    request_prompt: t.prompt,
    response_completion: t.completion,
  };
});

const sessions = Array.from({ length: 6 }, (_, s) => {
  const entries = accessLogs.slice(s * 3, s * 3 + 3);
  const sum = (
    key: "input_tokens" | "output_tokens" | "total_tokens" | "cost_usd",
  ) => +entries.reduce((total, e) => total + e[key], 0).toFixed(4);
  return {
    session_id: `sess-${s + 1}`,
    user_id: entries[0].user_id,
    group_ids: entries[0].group_ids,
    started_at: entries[entries.length - 1].timestamp,
    ended_at: entries[0].timestamp,
    request_count: entries.length,
    input_tokens: sum("input_tokens"),
    output_tokens: sum("output_tokens"),
    total_tokens: sum("total_tokens"),
    cost_usd: sum("cost_usd"),
    providers: [...new Set(entries.map((e) => e.provider))],
    models: [...new Set(entries.map((e) => e.model))],
    decision: entries.some((e) => e.decision === "deny") ? "deny" : "allow",
    entries,
  };
});

const paginated =
  (items: unknown[]) =>
  ({ query }: HandlerContext) => {
    const page = Number(query.get("page") ?? 1);
    const size = Number(query.get("page_size") ?? 25);
    return {
      data: items.slice((page - 1) * size, page * size),
      page,
      page_size: size,
      total_pages: Math.ceil(items.length / size),
      total_records: items.length,
    };
  };

export const agentNetworkFixtures: Record<string, Handler> = {
  "GET /agent-network/agent-config": agentConfig,
  "GET /agent-network/settings": agentSettings,
  "GET /agent-network/providers": agentProviders,
  "GET /agent-network/policies": agentPolicies,
  "GET /agent-network/guardrails": agentGuardrails,
  "GET /agent-network/budget-rules": agentBudgetRules,
  "GET /agent-network/catalog/providers": catalog,
  // Model discovery lists what the typed credential can reach.
  "POST /agent-network/catalog/providers/models": ({
    body,
  }: HandlerContext) => {
    const id = (body as { catalog_provider_id?: string })?.catalog_provider_id;
    const entry = catalog.find((c) => c.id === id);
    return {
      models: (entry?.models ?? []).map((m) => ({ ...m, pricing_known: true })),
    };
  },
  "GET /agent-network/usage/overview": usageBuckets,
  // The server answers 404 while no managed gateway exists; a rejected request is as close as the mock gets.
  "GET /integrations/agent-network/managed-proxy": () => {
    throw new Error("no managed proxy deployment");
  },
  "GET /agent-network/access-logs": paginated(accessLogs),
  "GET /agent-network/access-log-sessions": paginated(sessions),
};

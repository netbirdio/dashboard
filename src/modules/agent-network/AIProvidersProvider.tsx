"use client";

import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  AgentBudgetRule,
  AgentGuardrail,
  AgentPolicy,
  AIProvider,
  AIProviderId,
  AttributionMode,
  BudgetWindow,
  EMPTY_POLICY_LIMITS,
  PolicyLimits,
  ProviderModel,
} from "@/modules/agent-network/data/mockData";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";

export type APIProviderModel = {
  id: string;
  input_per_1k: number;
  output_per_1k: number;
};

export type APIProvider = {
  id: string;
  provider_id: string;
  name: string;
  upstream_url: string;
  models: APIProviderModel[] | null;
  // extra_values is a map of catalog-declared extra header names to
  // operator-typed values (e.g. {"x-portkey-config": "pc-..."}).
  // Stamped on every upstream request by the proxy.
  extra_values?: Record<string, string>;
  // identity_header_user_id / identity_header_groups carry the
  // operator-set wire header names for catalog entries that flag
  // HeaderPair as customizable (Bifrost). Empty disables stamping
  // for that dimension. Catalog defaults (e.g. x-bf-dim-*) are
  // surfaced as placeholders by the dashboard but only the values
  // stored here land on the wire.
  identity_header_user_id?: string;
  identity_header_groups?: string;
  // Skip TLS certificate verification on upstream requests (custom providers
  // with self-signed certs). Off by default.
  skip_tls_verification?: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type APIProviderRequest = {
  provider_id: string;
  name: string;
  upstream_url: string;
  // bootstrap_cluster is only honoured on the first provider create
  // for the account; subsequent creates and all updates ignore it.
  bootstrap_cluster?: string;
  api_key?: string;
  extra_values?: Record<string, string>;
  identity_header_user_id?: string;
  identity_header_groups?: string;
  skip_tls_verification?: boolean;
  models: APIProviderModel[];
  enabled?: boolean;
};

export type ProviderConnectInput = {
  providerId: AIProviderId;
  name: string;
  upstreamUrl: string;
  // bootstrapCluster is only used on first-create to seed the
  // account-level Settings row; ignored after that.
  bootstrapCluster?: string;
  apiKey: string;
  extraValues?: Record<string, string>;
  identityHeaderUserId?: string;
  identityHeaderGroups?: string;
  // Skip upstream TLS verification (custom providers with self-signed certs).
  skipTlsVerification?: boolean;
  models: ProviderModel[];
  enabled?: boolean;
};

export type ProviderUpdateInput = {
  providerId?: AIProviderId;
  name?: string;
  upstreamUrl?: string;
  apiKey?: string;
  extraValues?: Record<string, string>;
  identityHeaderUserId?: string;
  identityHeaderGroups?: string;
  skipTlsVerification?: boolean;
  models?: ProviderModel[];
  enabled?: boolean;
};

export type APIAgentNetworkSettings = {
  cluster: string;
  subdomain: string;
  endpoint: string;
  attribution_mode?: AttributionMode;
  default_user_monthly_budget?: number;
  enable_log_collection: boolean;
  enable_prompt_collection: boolean;
  redact_pii: boolean;
  access_log_retention_days?: number;
  created_at: string;
  updated_at: string;
};

// APIAgentNetworkSettingsRequest matches the PUT /agent-network/settings
// body. Read-only fields (cluster, subdomain, endpoint, timestamps) are
// stamped by the backend and never sent from the dashboard.
export type APIAgentNetworkSettingsRequest = {
  enable_log_collection: boolean;
  enable_prompt_collection: boolean;
  redact_pii: boolean;
  access_log_retention_days: number;
};

export type AgentNetworkSettings = {
  cluster: string;
  subdomain: string;
  endpoint: string;
  attributionMode: AttributionMode;
  defaultUserMonthlyBudget: number;
  enableLogCollection: boolean;
  enablePromptCollection: boolean;
  redactPii: boolean;
  accessLogRetentionDays: number;
};

export type AgentNetworkSettingsUpdate = {
  enableLogCollection: boolean;
  enablePromptCollection: boolean;
  redactPii: boolean;
  accessLogRetentionDays: number;
};

function fromAPI(p: APIProvider): AIProvider {
  const models: ProviderModel[] = (p.models ?? []).map((m) => ({
    id: m.id,
    inputPer1k: m.input_per_1k,
    outputPer1k: m.output_per_1k,
  }));
  return {
    id: p.id,
    providerId: p.provider_id as AIProviderId,
    name: p.name,
    upstreamUrl: p.upstream_url,
    extraValues: p.extra_values ?? {},
    identityHeaderUserId: p.identity_header_user_id,
    identityHeaderGroups: p.identity_header_groups,
    skipTlsVerification: p.skip_tls_verification ?? false,
    status: p.enabled ? "active" : "disabled",
    models,
    allowedGroups: [],
    allowedCountries: [],
    blockedCountries: [],
    authMethod: "sso",
    hasApiKey: true,
    promptRetentionDays: 0,
    promptRedactionLevel: "none",
    monthlyBudgetSoftUsd: 0,
    monthlyBudgetHardUsd: 0,
    currentMonthSpendUsd: 0,
    last7dSpendUsd: 0,
    requestsLast7d: 0,
    topModel: models[0]?.id ?? "—",
    topUser: "—",
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    denyRatePct: 0,
    enabled: p.enabled,
  };
}

function toAPIModels(models: ProviderModel[]): APIProviderModel[] {
  return models.map((m) => ({
    id: m.id,
    input_per_1k: m.inputPer1k,
    output_per_1k: m.outputPer1k,
  }));
}

function toCreateRequest(input: ProviderConnectInput): APIProviderRequest {
  return {
    provider_id: input.providerId,
    name: input.name,
    upstream_url: input.upstreamUrl,
    bootstrap_cluster: input.bootstrapCluster,
    api_key: input.apiKey,
    extra_values: input.extraValues,
    identity_header_user_id: input.identityHeaderUserId,
    identity_header_groups: input.identityHeaderGroups,
    skip_tls_verification: input.skipTlsVerification,
    models: toAPIModels(input.models),
    enabled: input.enabled,
  };
}

function settingsFromAPI(s: APIAgentNetworkSettings): AgentNetworkSettings {
  return {
    cluster: s.cluster,
    subdomain: s.subdomain,
    endpoint: s.endpoint,
    attributionMode: s.attribution_mode ?? "priority",
    defaultUserMonthlyBudget: s.default_user_monthly_budget ?? 0,
    enableLogCollection: s.enable_log_collection ?? false,
    enablePromptCollection: s.enable_prompt_collection ?? false,
    redactPii: s.redact_pii ?? false,
    accessLogRetentionDays: s.access_log_retention_days ?? 30,
  };
}

function settingsToRequest(
  s: AgentNetworkSettingsUpdate,
): APIAgentNetworkSettingsRequest {
  return {
    enable_log_collection: s.enableLogCollection,
    enable_prompt_collection: s.enablePromptCollection,
    redact_pii: s.redactPii,
    access_log_retention_days: s.accessLogRetentionDays,
  };
}

export type APIAgentBudgetRule = {
  id: string;
  name: string;
  enabled: boolean;
  target_groups: string[] | null;
  target_users: string[] | null;
  limits: APIPolicyLimits;
  created_at: string;
  updated_at: string;
};

export type APIAgentBudgetRuleRequest = {
  name: string;
  enabled?: boolean;
  target_groups?: string[];
  target_users?: string[];
  limits: APIPolicyLimits;
};

function budgetRuleFromAPI(r: APIAgentBudgetRule): AgentBudgetRule {
  return {
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    targetGroups: r.target_groups ?? [],
    targetUsers: r.target_users ?? [],
    limits: policyLimitsFromAPI(r.limits),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function budgetRuleToRequest(
  r: Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt">,
): APIAgentBudgetRuleRequest {
  return {
    name: r.name,
    enabled: r.enabled,
    target_groups: r.targetGroups,
    target_users: r.targetUsers,
    limits: policyLimitsToAPI(r.limits),
  };
}

export type APIPolicy = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  source_groups: string[];
  destination_provider_ids: string[];
  guardrail_ids: string[];
  limits?: APIPolicyLimits;
  created_at: string;
  updated_at: string;
};

export type APIPolicyRequest = {
  name: string;
  description?: string;
  enabled?: boolean;
  source_groups: string[];
  destination_provider_ids: string[];
  guardrail_ids?: string[];
  limits?: APIPolicyLimits;
};

function policyFromAPI(p: APIPolicy): AgentPolicy {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    enabled: p.enabled,
    sourceGroups: p.source_groups ?? [],
    destinationProviderIds: p.destination_provider_ids ?? [],
    guardrailIds: p.guardrail_ids ?? [],
    limits: policyLimitsFromAPI(p.limits),
  };
}

function policyToRequest(p: Omit<AgentPolicy, "id">): APIPolicyRequest {
  return {
    name: p.name,
    description: p.description,
    enabled: p.enabled,
    source_groups: p.sourceGroups,
    destination_provider_ids: p.destinationProviderIds,
    guardrail_ids: p.guardrailIds,
    limits: policyLimitsToAPI(p.limits),
  };
}

export type APIGuardrailChecks = {
  model_allowlist: { enabled: boolean; models: string[] };
  prompt_capture: { enabled: boolean; redact_pii: boolean };
};

export type APIPolicyTokenLimit = {
  enabled: boolean;
  group_cap: number;
  user_cap: number;
  window_seconds: number;
};

export type APIPolicyBudgetLimit = {
  enabled: boolean;
  group_cap_usd: number;
  user_cap_usd: number;
  window_seconds: number;
};

export type APIPolicyLimits = {
  token_limit: APIPolicyTokenLimit;
  budget_limit: APIPolicyBudgetLimit;
};

export type APIGuardrail = {
  id: string;
  name: string;
  description: string;
  checks: APIGuardrailChecks;
  created_at: string;
  updated_at: string;
};

export type APIGuardrailRequest = {
  name: string;
  description?: string;
  checks: APIGuardrailChecks;
};

function guardrailFromAPI(g: APIGuardrail): AgentGuardrail {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    checks: {
      model_allowlist: {
        enabled: g.checks.model_allowlist.enabled,
        models: g.checks.model_allowlist.models ?? [],
      },
      prompt_capture: {
        enabled: g.checks.prompt_capture.enabled,
        redactPii: g.checks.prompt_capture.redact_pii,
      },
    },
  };
}

function guardrailToRequest(
  g: Omit<AgentGuardrail, "id">,
): APIGuardrailRequest {
  return {
    name: g.name,
    description: g.description,
    checks: {
      model_allowlist: {
        enabled: g.checks.model_allowlist.enabled,
        models: g.checks.model_allowlist.models,
      },
      prompt_capture: {
        enabled: g.checks.prompt_capture.enabled,
        redact_pii: g.checks.prompt_capture.redactPii,
      },
    },
  };
}

// Default window when management hasn't yet stamped one — 30 days
// (2_592_000s) matches the legacy 720h default expressed in seconds.
const DEFAULT_WINDOW_SECONDS = 2_592_000;

function policyLimitsFromAPI(l: APIPolicyLimits | undefined): PolicyLimits {
  if (!l) return EMPTY_POLICY_LIMITS;
  return {
    tokenLimit: {
      enabled: l.token_limit?.enabled ?? false,
      groupCap: l.token_limit?.group_cap ?? 0,
      userCap: l.token_limit?.user_cap ?? 0,
      windowSeconds: l.token_limit?.window_seconds ?? DEFAULT_WINDOW_SECONDS,
    },
    budgetLimit: {
      enabled: l.budget_limit?.enabled ?? false,
      groupCapUsd: l.budget_limit?.group_cap_usd ?? 0,
      userCapUsd: l.budget_limit?.user_cap_usd ?? 0,
      windowSeconds: l.budget_limit?.window_seconds ?? DEFAULT_WINDOW_SECONDS,
    },
  };
}

function policyLimitsToAPI(l: PolicyLimits): APIPolicyLimits {
  return {
    token_limit: {
      enabled: l.tokenLimit.enabled,
      group_cap: l.tokenLimit.groupCap,
      user_cap: l.tokenLimit.userCap,
      window_seconds: l.tokenLimit.windowSeconds,
    },
    budget_limit: {
      enabled: l.budgetLimit.enabled,
      group_cap_usd: l.budgetLimit.groupCapUsd,
      user_cap_usd: l.budgetLimit.userCapUsd,
      window_seconds: l.budgetLimit.windowSeconds,
    },
  };
}

type AIProvidersContextValue = {
  providers: AIProvider[];
  policies: AgentPolicy[];
  guardrails: AgentGuardrail[];
  budgetRules: AgentBudgetRule[];
  budgetRulesLoading: boolean;
  settings: AgentNetworkSettings | null;
  settingsLoading: boolean;
  isLoading: boolean;
  openWizard: () => void;
  closeWizard: () => void;
  isWizardOpen: boolean;
  addProvider: (input: ProviderConnectInput) => Promise<AIProvider | undefined>;
  updateProvider: (id: string, updates: ProviderUpdateInput) => Promise<void>;
  toggleProvider: (id: string) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  addPolicy: (
    policy: Omit<AgentPolicy, "id">,
  ) => Promise<AgentPolicy | undefined>;
  updatePolicy: (id: string, updates: Partial<AgentPolicy>) => Promise<void>;
  togglePolicy: (id: string) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  addGuardrail: (
    guardrail: Omit<AgentGuardrail, "id">,
  ) => Promise<AgentGuardrail | undefined>;
  updateGuardrail: (
    id: string,
    updates: Partial<AgentGuardrail>,
  ) => Promise<void>;
  deleteGuardrail: (id: string) => Promise<void>;
  addBudgetRule: (
    rule: Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt">,
  ) => Promise<AgentBudgetRule | undefined>;
  updateBudgetRule: (
    id: string,
    updates: Partial<Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt">>,
  ) => Promise<void>;
  toggleBudgetRule: (id: string) => Promise<void>;
  deleteBudgetRule: (id: string) => Promise<void>;
  // Resolves to true on a confirmed save, false when the update failed (errors
  // are handled/notified internally) so callers can avoid clearing dirty state
  // on failure.
  updateAgentNetworkSettings: (
    updates: AgentNetworkSettingsUpdate,
  ) => Promise<boolean>;
};

const AIProvidersContext = createContext<AIProvidersContextValue | null>(null);

export function useAIProviders() {
  const ctx = useContext(AIProvidersContext);
  if (!ctx) {
    throw new Error("useAIProviders must be used inside <AIProvidersProvider>");
  }
  return ctx;
}

// useAgentNetworkSettings fetches the account-level agent-network settings.
// Returns null until the first provider is created — newer backends respond
// 200 + JSON null while no settings row exists; older backends respond 404,
// which we still tolerate via ignoreError so older deploys don't surface
// a spurious error in the empty state.
export function useAgentNetworkSettings() {
  const { enabled: agentNetworkEnabled } = useAgentNetworkMode();
  const { data, error, isLoading, mutate } =
    useFetchApi<APIAgentNetworkSettings>(
      "/agent-network/settings",
      true,
      true,
      agentNetworkEnabled,
    );
  const settings = useMemo<AgentNetworkSettings | null>(
    () => (data ? settingsFromAPI(data) : null),
    [data],
  );
  const notFound = !!error && (error as { code?: number }).code === 404;
  return {
    settings,
    isLoading: isLoading && !notFound,
    notFound,
    mutate,
  } as const;
}

type Props = { children: React.ReactNode };

export default function AIProvidersProvider({ children }: Readonly<Props>) {
  // Gate every fetch on the feature flag so this provider is inert when
  // disabled — it can safely wrap surfaces like the Control Center
  // without hitting agent-network endpoints in deployments that don't
  // have the feature.
  const { enabled: agentNetworkEnabled } = useAgentNetworkMode();

  const {
    data: apiProviders,
    isLoading,
    mutate,
  } = useFetchApi<APIProvider[]>(
    "/agent-network/providers",
    false,
    true,
    agentNetworkEnabled,
  );
  const providersApi = useApiCall<APIProvider>("/agent-network/providers");

  const { data: apiPolicies, mutate: mutatePolicies } = useFetchApi<
    APIPolicy[]
  >("/agent-network/policies", false, true, agentNetworkEnabled);
  const policiesApi = useApiCall<APIPolicy>("/agent-network/policies");

  const { data: apiGuardrails, mutate: mutateGuardrails } = useFetchApi<
    APIGuardrail[]
  >("/agent-network/guardrails", false, true, agentNetworkEnabled);
  const guardrailsApi = useApiCall<APIGuardrail>("/agent-network/guardrails");

  const {
    data: apiBudgetRules,
    isLoading: budgetRulesLoading,
    mutate: mutateBudgetRules,
  } = useFetchApi<APIAgentBudgetRule[]>(
    "/agent-network/budget-rules",
    false,
    true,
    agentNetworkEnabled,
  );
  const budgetRulesApi = useApiCall<APIAgentBudgetRule>(
    "/agent-network/budget-rules",
  );

  const {
    settings,
    isLoading: settingsLoading,
    mutate: mutateSettings,
  } = useAgentNetworkSettings();
  const settingsApi = useApiCall<APIAgentNetworkSettings>(
    "/agent-network/settings",
  );

  const providers = useMemo<AIProvider[]>(
    () => (apiProviders ?? []).map(fromAPI),
    [apiProviders],
  );

  const policies = useMemo<AgentPolicy[]>(
    () => (apiPolicies ?? []).map(policyFromAPI),
    [apiPolicies],
  );

  const guardrails = useMemo<AgentGuardrail[]>(
    () => (apiGuardrails ?? []).map(guardrailFromAPI),
    [apiGuardrails],
  );

  const budgetRules = useMemo<AgentBudgetRule[]>(
    () => (apiBudgetRules ?? []).map(budgetRuleFromAPI),
    [apiBudgetRules],
  );

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const openWizard = useCallback(() => setIsWizardOpen(true), []);
  const closeWizard = useCallback(() => setIsWizardOpen(false), []);

  const addProvider = useCallback(
    async (input: ProviderConnectInput) => {
      try {
        const created = await providersApi.post(toCreateRequest(input));
        await mutate();
        // First-create bootstraps account-level settings on the
        // backend; refresh so the page header flips out of the empty
        // state without a manual reload.
        await mutateSettings();
        notify({
          title: "AI provider connected",
          description: `${created.name} is now available on your agent network endpoint.`,
        });
        return fromAPI(created);
      } catch (err) {
        notify({
          title: "Failed to connect provider",
          description: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },
    [providersApi, mutate, mutateSettings],
  );

  const updateProvider = useCallback(
    async (id: string, updates: ProviderUpdateInput) => {
      const existing = (apiProviders ?? []).find((p) => p.id === id);
      if (!existing) return;
      const merged: APIProviderRequest = {
        provider_id: updates.providerId ?? existing.provider_id,
        name: updates.name ?? existing.name,
        upstream_url: updates.upstreamUrl ?? existing.upstream_url,
        api_key: updates.apiKey,
        extra_values: updates.extraValues ?? existing.extra_values,
        // Identity-header overrides: nil means "leave unchanged"
        // (the openapi spec says omitted = preserve, empty string =
        // explicit clear). Forward whatever the modal sent and let
        // the backend's FromAPIRequest handle the empty-vs-nil
        // semantics.
        identity_header_user_id:
          updates.identityHeaderUserId ?? existing.identity_header_user_id,
        identity_header_groups:
          updates.identityHeaderGroups ?? existing.identity_header_groups,
        skip_tls_verification:
          updates.skipTlsVerification ?? existing.skip_tls_verification,
        models: updates.models
          ? toAPIModels(updates.models)
          : existing.models ?? [],
        enabled: updates.enabled ?? existing.enabled,
      };
      try {
        await providersApi.put(merged, `/${id}`);
        await mutate();
        notify({
          title: "Provider updated",
          description: "Settings saved.",
        });
      } catch (err) {
        notify({
          title: "Failed to update provider",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [apiProviders, providersApi, mutate],
  );

  const toggleProvider = useCallback(
    async (id: string) => {
      const existing = (apiProviders ?? []).find((p) => p.id === id);
      if (!existing) return;
      await updateProvider(id, { enabled: !existing.enabled });
    },
    [apiProviders, updateProvider],
  );

  const deleteProvider = useCallback(
    async (id: string) => {
      try {
        await providersApi.del("", `/${id}`);
        await mutate();
        notify({
          title: "Provider removed",
          description: "Endpoint will be torn down on next mapping update.",
        });
      } catch (err) {
        notify({
          title: "Failed to remove provider",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [providersApi, mutate],
  );

  const addPolicy = useCallback(
    async (policy: Omit<AgentPolicy, "id">) => {
      try {
        const created = await policiesApi.post(policyToRequest(policy));
        await mutatePolicies();
        notify({
          title: "Policy created",
          description: `${created.name} is now active.`,
        });
        return policyFromAPI(created);
      } catch (err) {
        notify({
          title: "Failed to create policy",
          description: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },
    [policiesApi, mutatePolicies],
  );

  const updatePolicy = useCallback(
    async (id: string, updates: Partial<AgentPolicy>) => {
      const existing = (apiPolicies ?? []).find((p) => p.id === id);
      if (!existing) return;
      const merged: APIPolicyRequest = {
        name: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        enabled: updates.enabled ?? existing.enabled,
        source_groups: updates.sourceGroups ?? existing.source_groups ?? [],
        destination_provider_ids:
          updates.destinationProviderIds ??
          existing.destination_provider_ids ??
          [],
        guardrail_ids: updates.guardrailIds ?? existing.guardrail_ids ?? [],
        limits: updates.limits
          ? policyLimitsToAPI(updates.limits)
          : existing.limits ?? policyLimitsToAPI(EMPTY_POLICY_LIMITS),
      };
      try {
        await policiesApi.put(merged, `/${id}`);
        await mutatePolicies();
        notify({
          title: "Policy updated",
          description: "Settings saved.",
        });
      } catch (err) {
        notify({
          title: "Failed to update policy",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [apiPolicies, policiesApi, mutatePolicies],
  );

  const togglePolicy = useCallback(
    async (id: string) => {
      const existing = (apiPolicies ?? []).find((p) => p.id === id);
      if (!existing) return;
      await updatePolicy(id, { enabled: !existing.enabled });
    },
    [apiPolicies, updatePolicy],
  );

  const deletePolicy = useCallback(
    async (id: string) => {
      try {
        await policiesApi.del("", `/${id}`);
        await mutatePolicies();
        notify({
          title: "Policy removed",
          description: "Policy deleted.",
        });
      } catch (err) {
        notify({
          title: "Failed to remove policy",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [policiesApi, mutatePolicies],
  );

  const addGuardrail = useCallback(
    async (guardrail: Omit<AgentGuardrail, "id">) => {
      try {
        const created = await guardrailsApi.post(guardrailToRequest(guardrail));
        await mutateGuardrails();
        notify({
          title: "Guardrail created",
          description: `${created.name} can now be attached to policies.`,
        });
        return guardrailFromAPI(created);
      } catch (err) {
        notify({
          title: "Failed to create guardrail",
          description: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },
    [guardrailsApi, mutateGuardrails],
  );

  const updateGuardrail = useCallback(
    async (id: string, updates: Partial<AgentGuardrail>) => {
      const existing = (apiGuardrails ?? []).find((g) => g.id === id);
      if (!existing) return;
      const merged = guardrailToRequest({
        name: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        checks: updates.checks
          ? { ...guardrailFromAPI(existing).checks, ...updates.checks }
          : guardrailFromAPI(existing).checks,
      });
      try {
        await guardrailsApi.put(merged, `/${id}`);
        await mutateGuardrails();
        notify({
          title: "Guardrail updated",
          description: "Settings saved.",
        });
      } catch (err) {
        notify({
          title: "Failed to update guardrail",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [apiGuardrails, guardrailsApi, mutateGuardrails],
  );

  const deleteGuardrail = useCallback(
    async (id: string) => {
      try {
        await guardrailsApi.del("", `/${id}`);
        await mutateGuardrails();
        notify({
          title: "Guardrail removed",
          description:
            "Existing policies still reference this guardrail until you detach it.",
        });
      } catch (err) {
        notify({
          title: "Failed to remove guardrail",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [guardrailsApi, mutateGuardrails],
  );

  const addBudgetRule = useCallback(
    async (rule: Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt">) => {
      try {
        const created = await budgetRulesApi.post(budgetRuleToRequest(rule));
        await mutateBudgetRules();
        notify({
          title: "Global limit created",
          description: `${created.name} is now active.`,
        });
        return budgetRuleFromAPI(created);
      } catch (err) {
        notify({
          title: "Failed to create global limit",
          description: err instanceof Error ? err.message : String(err),
        });
        return undefined;
      }
    },
    [budgetRulesApi, mutateBudgetRules],
  );

  const updateBudgetRule = useCallback(
    async (
      id: string,
      updates: Partial<Omit<AgentBudgetRule, "id" | "createdAt" | "updatedAt">>,
    ) => {
      const existing = (apiBudgetRules ?? []).find((r) => r.id === id);
      if (!existing) return;
      const merged: APIAgentBudgetRuleRequest = {
        name: updates.name ?? existing.name,
        enabled: updates.enabled ?? existing.enabled,
        target_groups: updates.targetGroups ?? existing.target_groups ?? [],
        target_users: updates.targetUsers ?? existing.target_users ?? [],
        limits: updates.limits
          ? policyLimitsToAPI(updates.limits)
          : existing.limits,
      };
      try {
        await budgetRulesApi.put(merged, `/${id}`);
        await mutateBudgetRules();
        notify({
          title: "Global limit updated",
          description: "Settings saved.",
        });
      } catch (err) {
        notify({
          title: "Failed to update global limit",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [apiBudgetRules, budgetRulesApi, mutateBudgetRules],
  );

  const toggleBudgetRule = useCallback(
    async (id: string) => {
      const existing = (apiBudgetRules ?? []).find((r) => r.id === id);
      if (!existing) return;
      await updateBudgetRule(id, { enabled: !existing.enabled });
    },
    [apiBudgetRules, updateBudgetRule],
  );

  const deleteBudgetRule = useCallback(
    async (id: string) => {
      try {
        await budgetRulesApi.del("", `/${id}`);
        await mutateBudgetRules();
        notify({
          title: "Global limit removed",
          description: "Global limit deleted.",
        });
      } catch (err) {
        notify({
          title: "Failed to remove global limit",
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [budgetRulesApi, mutateBudgetRules],
  );

  const updateAgentNetworkSettings = useCallback(
    async (updates: AgentNetworkSettingsUpdate) => {
      try {
        await settingsApi.put(settingsToRequest(updates));
        await mutateSettings();
        notify({
          title: "Account controls updated",
          description: "Settings saved.",
        });
        return true;
      } catch (err) {
        notify({
          title: "Failed to update account controls",
          description: err instanceof Error ? err.message : String(err),
        });
        return false;
      }
    },
    [settingsApi, mutateSettings],
  );

  const value = useMemo<AIProvidersContextValue>(
    () => ({
      providers,
      policies,
      guardrails,
      budgetRules,
      budgetRulesLoading,
      settings,
      settingsLoading,
      isLoading,
      openWizard,
      closeWizard,
      isWizardOpen,
      addProvider,
      updateProvider,
      toggleProvider,
      deleteProvider,
      addPolicy,
      updatePolicy,
      togglePolicy,
      deletePolicy,
      addGuardrail,
      updateGuardrail,
      deleteGuardrail,
      addBudgetRule,
      updateBudgetRule,
      toggleBudgetRule,
      deleteBudgetRule,
      updateAgentNetworkSettings,
    }),
    [
      providers,
      policies,
      guardrails,
      budgetRules,
      budgetRulesLoading,
      settings,
      settingsLoading,
      isLoading,
      isWizardOpen,
      openWizard,
      closeWizard,
      addProvider,
      updateProvider,
      toggleProvider,
      deleteProvider,
      addPolicy,
      updatePolicy,
      togglePolicy,
      deletePolicy,
      addGuardrail,
      updateGuardrail,
      deleteGuardrail,
      addBudgetRule,
      updateBudgetRule,
      toggleBudgetRule,
      deleteBudgetRule,
      updateAgentNetworkSettings,
    ],
  );

  return (
    <AIProvidersContext.Provider value={value}>
      {children}
    </AIProvidersContext.Provider>
  );
}

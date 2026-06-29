// agentAccessLogApi wires the dedicated, server-side-filtered agent-network
// access-log endpoint (/api/agent-network/access-logs). Unlike the legacy
// /events/proxy path (which kept LLM data in a metadata map), this endpoint
// returns flattened, queryable columns, so the mapping here is direct.

import { ColumnFiltersState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { DateRange } from "react-day-picker";
import {
  AIAccessLogDecision,
  AIAccessLogEntry,
  AIProviderId,
} from "@/modules/agent-network/data/mockData";

// APIAgentNetworkAccessLog mirrors the api.AgentNetworkAccessLog response shape.
export type APIAgentNetworkAccessLog = {
  id: string;
  service_id: string;
  timestamp: string;
  status_code: number;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  user_id?: string;
  source_ip?: string;
  method?: string;
  host?: string;
  path?: string;
  provider?: string;
  model?: string;
  resolved_provider_id?: string;
  selected_policy_id?: string;
  decision?: string;
  deny_reason?: string;
  stream?: boolean;
  group_ids?: string[];
  request_prompt?: string;
  response_completion?: string;
};

export type APIAgentNetworkAccessLogsResponse = {
  data: APIAgentNetworkAccessLog[];
  page: number;
  page_size: number;
  total_pages: number;
  total_records: number;
};

// APIAgentNetworkUsageBucket mirrors the api.AgentNetworkUsageBucket response —
// one aggregated time bucket from /agent-network/usage/overview.
export type APIAgentNetworkUsageBucket = {
  period_start: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
};

export type UsageGranularity = "day" | "week" | "month";

function colValue<T>(filters: ColumnFiltersState, id: string): T | undefined {
  return filters.find((f) => f.id === id)?.value as T | undefined;
}

// buildUsageOverviewQuery turns the shared access-log filter state into the
// /agent-network/usage/overview query string. Group names are resolved to ids
// and the picked user email to its id, matching the backend's filter params.
export function buildUsageOverviewQuery(
  columnFilters: ColumnFiltersState,
  groupIdByName: Map<string, string>,
  userIdByEmail: Map<string, string>,
  granularity: UsageGranularity = "day",
): string {
  const params = new URLSearchParams();
  params.set("granularity", granularity);

  const date = colValue<DateRange>(columnFilters, "date");
  if (date?.from)
    params.set("start_date", dayjs(date.from).startOf("day").toISOString());
  if (date?.to)
    params.set("end_date", dayjs(date.to).endOf("day").toISOString());

  const email = colValue<string>(columnFilters, "user");
  if (email) {
    const id = userIdByEmail.get(email);
    if (id) params.set("user_id", id);
  }

  const groupNames = colValue<string[]>(columnFilters, "group") ?? [];
  if (groupNames.length)
    params.set(
      "group_id",
      groupNames.map((n) => groupIdByName.get(n) ?? n).join(","),
    );

  const providerIds = colValue<string[]>(columnFilters, "provider") ?? [];
  if (providerIds.length) params.set("provider_id", providerIds.join(","));

  const models = colValue<string[]>(columnFilters, "model") ?? [];
  if (models.length) params.set("model", models.join(","));

  return params.toString();
}

const KNOWN_PROVIDER_IDS: AIProviderId[] = [
  "openai_api",
  "anthropic_api",
  "azure_openai_api",
  "bedrock_api",
  "vertex_ai_api",
  "mistral_api",
  "custom",
];

// normalizeProviderId maps the proxy's short vendor label ("openai") to the
// dashboard catalog id ("openai_api"), falling back to "custom".
function normalizeProviderId(vendor: string | undefined): AIProviderId {
  const raw = vendor ?? "";
  if (!raw) return "custom";
  const candidate = raw.endsWith("_api") ? raw : `${raw}_api`;
  return (KNOWN_PROVIDER_IDS as string[]).includes(candidate)
    ? (candidate as AIProviderId)
    : "custom";
}

// resolveGroupNames maps the entry's group ids to the catalog's current names,
// falling back to the id when a group has since been deleted.
function resolveGroupNames(
  ids: string[] | undefined,
  byID: Map<string, string>,
): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => byID.get(id) ?? id);
}

// accessLogFromAgentAPI maps a flattened API entry to the dashboard's
// AIAccessLogEntry. groupNamesByID resolves authorising group ids to names for
// display.
export function accessLogFromAgentAPI(
  entry: APIAgentNetworkAccessLog,
  groupNamesByID: Map<string, string>,
): AIAccessLogEntry {
  const decision: AIAccessLogDecision =
    entry.decision === "deny" ? "deny" : "allow";
  const prompt = entry.request_prompt ?? "";
  const completion = entry.response_completion ?? "";
  const promptPreview = prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt;

  return {
    id: entry.id,
    serviceId: entry.service_id,
    providerId: normalizeProviderId(entry.provider),
    resolvedProviderId: entry.resolved_provider_id ?? "",
    timestamp: entry.timestamp,
    user: entry.user_id ?? "",
    userId: entry.user_id ?? "",
    userGroups: resolveGroupNames(entry.group_ids, groupNamesByID),
    sourceIp: entry.source_ip ?? "",
    countryCode: "",
    model: entry.model ?? "",
    inputTokens: entry.input_tokens ?? 0,
    outputTokens: entry.output_tokens ?? 0,
    costUsd: entry.cost_usd ?? 0,
    durationMs: entry.duration_ms,
    decision,
    denyReason: decision === "deny" ? entry.deny_reason : undefined,
    policyName: "",
    selectedPolicyId: entry.selected_policy_id ?? "",
    promptPreview,
    prompt,
    completion,
    stream: entry.stream ?? false,
    status: entry.status_code,
    method: entry.method ?? "",
    path: entry.path ?? "",
  };
}

// Agent Network log streaming: where an account's agent-network access logs
// are sent besides management's own store. The API lives at
// /integrations/agent-network/log-streaming and every config value is a
// string; responses mask secrets with "****", and sending the mask back on
// update keeps the stored value.

export const LOG_STREAMING_URL = "/integrations/agent-network/log-streaming";

export type LogStreamingPlatform = "http" | "otlp_grpc";

export interface LogStreamingIntegration {
  id: number;
  account_id: string;
  enabled: boolean;
  platform: LogStreamingPlatform;
  created_at: string;
  updated_at: string;
  config: Record<string, string>;
}

// Advanced delivery knobs; the placeholder is the server default.
export const ADVANCED_FIELDS = [
  { key: "timeout", label: "Timeout", placeholder: "30s" },
  { key: "batch_size", label: "Batch size", placeholder: "100" },
  { key: "flush_interval", label: "Flush interval", placeholder: "2s" },
  { key: "queue_size", label: "Queue size", placeholder: "10000" },
  { key: "retry_max_attempts", label: "Max attempts", placeholder: "3" },
  {
    key: "retry_initial_interval",
    label: "Initial retry interval",
    placeholder: "1s",
  },
  {
    key: "retry_max_interval",
    label: "Max retry interval",
    placeholder: "30s",
  },
] as const;

// The keys the form owns for each platform. api_key and basic_auth are left
// alone: the form sends auth as an Authorization header, and keys it doesn't
// send are kept by the server on update.
const FORM_KEYS: Record<LogStreamingPlatform, string[]> = {
  http: ["url", "signing_secret"],
  otlp_grpc: ["endpoint", "insecure", "service_name"],
};
const COMMON_KEYS = ["enrich_user_info", ...ADVANCED_FIELDS.map((f) => f.key)];

/**
 * Builds the config map for a create (POST) or update (PUT). On create empty
 * fields are left out so the server defaults apply; on update they are sent
 * as "" because that is how the API removes a key.
 */
export function buildLogStreamingConfig(
  platform: LogStreamingPlatform,
  values: Record<string, string>,
  headers: Record<string, string> | undefined,
  editing: boolean,
): Record<string, string> {
  const config: Record<string, string> = {};
  for (const key of [...FORM_KEYS[platform], ...COMMON_KEYS]) {
    const value = values[key]?.trim() ?? "";
    if (value !== "" || editing) config[key] = value;
  }
  const hasHeaders = !!headers && Object.keys(headers).length > 0;
  if (hasHeaders) config.headers = JSON.stringify(headers);
  else if (editing) config.headers = "";
  return config;
}

/** Validates an OTLP/gRPC endpoint: host:port, no scheme. */
export function otlpEndpointError(endpoint: string): string {
  if (endpoint === "") return "";
  if (/^(\[[^\]\s]+\]|[^\s/:[\]]+):\d{1,5}$/.test(endpoint)) return "";
  return "Enter host:port without a scheme, e.g., otel-collector.internal:4317";
}

export function parseLogStreamingHeaders(
  raw?: string,
): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

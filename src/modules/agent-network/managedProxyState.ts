import type { ApiStatusResponse } from "@utils/api";
import type { AgentNetworkManagedProxy } from "@/modules/agent-network/AIProvidersProvider";

// The states the API documents today. state stays an open string on the wire,
// so any other value is handled as unknown, never as an error.
export const MANAGED_PROXY_STATE = {
  PROVISIONING: "provisioning",
  READY: "ready",
  FAILED: "failed",
} as const;

const POLL_PROVISIONING_MS = 3_000;
const POLL_SLOW_MS = 15_000;

// managedProxyPollInterval returns how long to wait before the next status
// read, or 0 to stop. failed is not final (the operator keeps retrying and
// the state can clear on its own), so it keeps a slow poll, as does a state
// this dashboard does not know yet.
export function managedProxyPollInterval(
  proxy: Pick<AgentNetworkManagedProxy, "state"> | undefined,
): number {
  if (!proxy) return 0;
  switch (proxy.state) {
    case MANAGED_PROXY_STATE.READY:
      return 0;
    case MANAGED_PROXY_STATE.PROVISIONING:
      return POLL_PROVISIONING_MS;
    default:
      return POLL_SLOW_MS;
  }
}

export type ProvisionOutcome =
  // 200 or 202: a deployment exists, in whatever state it reports.
  | { kind: "deployment"; proxy: AgentNetworkManagedProxy }
  // 409: the account already has an endpoint managed provisioning does not
  // own. It is configured; retrying cannot change that.
  | { kind: "conflict"; endpoint: string }
  // 412 (no proxy-manager cluster) or 503 (endpoint allocation exhausted).
  | { kind: "unavailable" }
  // 404: the provisioner is not configured, so the route does not exist.
  | { kind: "not-configured" }
  // 403: the caller lacks agent_network create.
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

// provisionOutcome classifies a managed-proxy POST response by its status
// code. The 409 and 503 bodies carry no code field, which is why the status
// has to come from the response itself.
export function provisionOutcome(res: ApiStatusResponse): ProvisionOutcome {
  const { code, body } = res;
  if ((code === 200 || code === 202) && isManagedProxy(body)) {
    return { kind: "deployment", proxy: body };
  }
  if (code === 409 && hasEndpoint(body)) {
    return { kind: "conflict", endpoint: body.endpoint };
  }
  if (code === 412 || code === 503) return { kind: "unavailable" };
  if (code === 404) return { kind: "not-configured" };
  if (code === 403) return { kind: "forbidden" };
  return {
    kind: "error",
    message: errorMessage(body) ?? `Request failed with status code ${code}`,
  };
}

export function isManagedProxy(
  body: unknown,
): body is AgentNetworkManagedProxy {
  if (!isRecord(body)) return false;
  return (
    typeof body.id === "string" &&
    typeof body.state === "string" &&
    typeof body.endpoint === "string" &&
    body.endpoint !== ""
  );
}

function hasEndpoint(body: unknown): body is { endpoint: string } {
  return (
    isRecord(body) && typeof body.endpoint === "string" && body.endpoint !== ""
  );
}

function errorMessage(body: unknown): string | undefined {
  if (!isRecord(body) || typeof body.message !== "string") return undefined;
  return body.message || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

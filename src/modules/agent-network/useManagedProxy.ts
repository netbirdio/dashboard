import useFetchApi, { useApiCallWithStatus } from "@utils/api";
import { useEffect } from "react";
import type { AgentNetworkManagedProxy } from "@/modules/agent-network/AIProvidersProvider";
import {
  managedProxyPollInterval,
  ProvisionOutcome,
  provisionOutcome,
} from "@/modules/agent-network/managedProxyState";

const MANAGED_PROXY_PATH = "/integrations/agent-network/managed-proxy";

// useManagedProxy reads the account's NetBird-managed gateway and starts one.
// A 404 on the read is the expected "no deployment" answer, so read errors are
// neither toasted nor retried. Once a deployment is known it is polled by its
// state until it is ready.
export function useManagedProxy(enabled: boolean) {
  const { data, error, isLoading, mutate } =
    useFetchApi<AgentNetworkManagedProxy>(
      MANAGED_PROXY_PATH,
      true,
      true,
      enabled,
      { shouldRetryOnError: false },
    );
  const request = useApiCallWithStatus(MANAGED_PROXY_PATH);

  const notFound = (error as { code?: number } | undefined)?.code === 404;
  // SWR keeps the last data next to a later error, which must not bring back
  // a deployment the server now says is gone.
  const proxy = notFound ? undefined : data;
  const interval = enabled ? managedProxyPollInterval(proxy) : 0;

  // A timer rather than SWR's refreshInterval: SWR skips its polling tick while
  // the cache holds an error, so a single failed read would stop the polling
  // for good. mutate() revalidates whatever the cache holds.
  useEffect(() => {
    if (!interval) return;
    const timer = setInterval(() => mutate(), interval);
    return () => clearInterval(timer);
  }, [interval, mutate]);

  // provision sends the POST, which is safe to repeat: it starts a deployment,
  // restarts a failed one, or reports the existing one. A reported deployment
  // is written to the cache so polling starts from it right away.
  const provision = async (): Promise<ProvisionOutcome> => {
    let outcome: ProvisionOutcome;
    try {
      outcome = provisionOutcome(await request.post());
    } catch (err) {
      const message = (err as { message?: string } | undefined)?.message;
      return { kind: "error", message: message || "Request failed" };
    }
    if (outcome.kind === "deployment") {
      await mutate(outcome.proxy, { revalidate: false });
    }
    return outcome;
  };

  return {
    proxy,
    isLoading: enabled && isLoading,
    provision,
  } as const;
}

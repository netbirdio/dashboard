import useFetchApi from "@utils/api";

// Wire types for the caller-scoped self-service endpoints. Both answers are
// computed server-side from the caller's own group memberships with the same
// rules the proxy enforces, so no agent_network permission is required to
// read them.
export type APIMeProvider = {
  name: string;
  catalog_id: string;
  api_flavor: string;
  all_models_allowed: boolean;
  models: string[];
};

export type APIMeSetup = {
  configured: boolean;
  endpoint: string;
  providers: APIMeProvider[];
};

export type APIMeConsumption = {
  dimension_kind: string;
  dimension_id: string;
  window_seconds: number;
  window_start_utc: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  updated_at: string;
};

/**
 * Fetch the caller's effective Agent Network setup. `configured` doubles as
 * the visibility switch for the self-service pages: the server deliberately
 * answers "not configured" both when the account has no Agent Network and
 * when the caller's policies grant no access, so a false here means there is
 * nothing to show this user. Errors are ignored so a management server
 * without the endpoint degrades to the section staying hidden.
 */
export const useMyAgentNetworkSetup = () => {
  const { data: setup, isLoading } = useFetchApi<APIMeSetup>(
    "/agent-network/me/setup",
    true,
  );
  return {
    setup,
    configured: setup?.configured === true,
    isLoading,
  } as const;
};

export const useMyAgentNetworkConsumption = (enabled: boolean) => {
  const { data: rows, isLoading } = useFetchApi<APIMeConsumption[]>(
    "/agent-network/me/consumption",
    true,
    true,
    enabled,
  );
  return { rows, isLoading } as const;
};

import useFetchApi from "@utils/api";
import { isAgentNetworkEnabled, isAgentNetworkOnly } from "@utils/netbird";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

/**
 * Resolve the Agent Network surface from the deployment config and the
 * logged-in account settings. "only" hides the regular UI and focuses the
 * dashboard on Agent Network, "enabled" makes the Agent Network surface
 * available at all. "loading" is true while the account is still being
 * fetched so guards can wait before redirecting.
 */
export const useAgentNetworkMode = () => {
  const { permission } = usePermissions();

  const { data: accounts, isLoading } = useFetchApi<Account[]>(
    "/accounts",
    true,
    true,
    permission.accounts.read,
  );

  return useMemo(() => {
    const account = accounts?.[0];
    const only =
      account?.settings?.agent_network_only === true || isAgentNetworkOnly();
    const enabled = only || isAgentNetworkEnabled();
    const loading = permission.accounts.read ? isLoading : false;
    return { only, enabled, loading } as const;
  }, [accounts, isLoading, permission.accounts.read]);
};

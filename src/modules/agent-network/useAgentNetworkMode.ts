import useFetchApi from "@utils/api";
import { isAgentNetworkEnabled, isAgentNetworkOnly } from "@utils/netbird";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  AGENT_NETWORK_SIGNUP_SOURCE,
  SIGNUP_SOURCE_LOCAL_STORAGE_KEY,
} from "@/hooks/useSignupSource";
import { Account } from "@/interfaces/Account";

/**
 * Report whether a new account arrived from the netbird.ai signup source and
 * has not been marked yet. The focused view then applies immediately instead
 * of flashing the regular onboarding while `agent_network_only` is persisted.
 */
const isAgentNetworkSignupPending = (account?: Account) => {
  if (account?.onboarding?.signup_form_pending !== true) return false;
  if (account.settings?.agent_network_only === true) return false;
  try {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY) ===
        AGENT_NETWORK_SIGNUP_SOURCE
    );
  } catch (e) {
    return false;
  }
};

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
      isAgentNetworkSignupPending(account) ||
      account?.settings?.agent_network_only === true ||
      isAgentNetworkOnly();
    const enabled = only || isAgentNetworkEnabled();
    const loading = permission.accounts.read ? isLoading : false;
    return { only, enabled, loading } as const;
  }, [accounts, isLoading, permission.accounts.read]);
};

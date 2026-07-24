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
  // Only apply optimism when the account has no explicit choice yet; an
  // explicit true or false is the user's decision and must be respected.
  if (account.settings?.agent_network_only !== undefined) return false;
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
    // Deployment config is a floor: NETBIRD_AGENT_NETWORK_ONLY focuses the
    // dashboard regardless of the per-account setting. The management API always
    // serializes agent_network_only (defaulting to false), so a false value
    // can't be read as "unset" — without this floor it would silently override
    // the env flag. When the config flag is off (e.g. cloud) the per-account
    // setting decides, so a user can still opt in via signup or the toggle.
    const setting = account?.settings?.agent_network_only;
    const only =
      isAgentNetworkOnly() || (setting ?? isAgentNetworkSignupPending(account));
    // dashboard_features.agent_network makes the Agent Network menu available
    // alongside the full dashboard (unlike "only", which hides everything else).
    const featureEnabled =
      account?.settings?.dashboard_features?.agent_network === true;
    const enabled = only || featureEnabled || isAgentNetworkEnabled();
    const loading = permission.accounts.read ? isLoading : false;
    return { only, enabled, loading } as const;
  }, [accounts, isLoading, permission.accounts.read]);
};

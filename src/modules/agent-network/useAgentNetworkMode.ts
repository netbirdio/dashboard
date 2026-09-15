import useFetchApi from "@utils/api";
import { isAgentNetworkEnabled, isAgentNetworkOnly } from "@utils/netbird";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  AGENT_NETWORK_SIGNUP_SOURCE,
  SIGNUP_SOURCE_LOCAL_STORAGE_KEY,
} from "@/hooks/useSignupSource";
import { Account } from "@/interfaces/Account";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";

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

  // The caller-scoped agent config answers "configured" only when the account
  // has an Agent Network endpoint, so it stands in as proof the surface
  // exists for callers who cannot resolve the flag themselves — the same
  // fallback shape as the grant check below, and gated the same way, so a
  // deployment that turns the surface off still turns it off for everyone
  // who can read that decision.
  const { configured: agentConfigured, isLoading: isAgentConfigLoading } =
    useMyAgentNetworkSetup();
  const hasAgentConfig = !permission?.accounts?.read && agentConfigured;

  // Resolving the flag needs accounts read, which the delegated roles below
  // account admin (usage_viewer, and agent_network scopes granted to custom
  // roles) may not hold. For them, holding an explicit agent_network grant
  // is proof enough the surface exists — the grants only exist on
  // deployments that have it. Callers WITH accounts read keep the flag as
  // the source of truth, so admins on deployments without the surface
  // don't get the menu from their blanket grants.
  const hasAgentNetworkGrant =
    !permission?.accounts?.read &&
    !!(
      permission?.["agent_network.providers"]?.read ||
      permission?.["agent_network.policies"]?.read ||
      permission?.["agent_network.usage"]?.read ||
      permission?.["agent_network.logs"]?.read ||
      permission?.["agent_network.settings"]?.read
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
    const enabled =
      only ||
      featureEnabled ||
      isAgentNetworkEnabled() ||
      hasAgentNetworkGrant ||
      hasAgentConfig;
    // Both answers gate the route tree, so neither may resolve late: the
    // layout renders nothing while loading and 404s the moment it is false.
    const loading =
      (permission.accounts.read ? isLoading : false) || isAgentConfigLoading;
    return { only, enabled, loading } as const;
  }, [
    accounts,
    isLoading,
    permission.accounts.read,
    hasAgentNetworkGrant,
    hasAgentConfig,
    isAgentConfigLoading,
  ]);
};

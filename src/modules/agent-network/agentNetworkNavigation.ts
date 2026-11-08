import {
  type AgentNetworkPermissions,
  hasAgentNetworkGrant,
} from "@/modules/agent-network/product";

type Input = {
  permission?: AgentNetworkPermissions;
  /**
   * The Agent Network surface exists for the deployment or account
   * (useAgentNetworkMode().enabled). Off hides every entry, configured
   * caller or not.
   */
  surface: boolean;
  /**
   * The caller's own policies grant them at least one provider
   * (useMyAgentNetworkSetup().configured), with or without an
   * agent_network permission. That is how plain users, the limited view
   * included, reach Connect Agent and their own Usage & Logs.
   */
  configured: boolean;
  /** The Insights preview flag (NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW). */
  insightsPreview: boolean;
};

/**
 * Which Agent Network sidebar entries the caller gets. Each page tracks its
 * agent_network submodule, so the delegated roles (agent_network_admin,
 * usage_viewer) see exactly the pages their grants cover.
 */
export const agentNetworkNavAccess = ({
  permission,
  surface,
  configured,
  insightsPreview,
}: Input) => {
  const read = (key: keyof AgentNetworkPermissions) =>
    surface && !!permission?.[key]?.read;
  // Connect Agent is the caller's own setup, so a configured caller gets
  // it; anyone administering Agent Network gets it too, so the page they
  // point their own agent at is never missing from the section they manage.
  const connect = surface && (configured || hasAgentNetworkGrant(permission));
  const providers = read("agent_network.providers");
  const policies = read("agent_network.policies");
  return {
    // Insights are analytics over usage, so they follow the usage grant.
    insights: insightsPreview && read("agent_network.usage"),
    // The server scopes usage and logs to a configured self-service caller.
    usage:
      read("agent_network.usage") ||
      read("agent_network.logs") ||
      (surface && configured),
    agents: connect || providers || policies,
    connect,
    providers,
    policies,
    configuration: read("agent_network.settings"),
  } as const;
};

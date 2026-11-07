/**
 * The dashboard holds two products: Networking (peers, access control,
 * networks, DNS, reverse proxy) and Agent Network. The current product
 * follows the route, so a link, a reload or the back button always lands
 * in the right one and nothing has to be stored.
 */
export type Product = "networking" | "agent-network";

export const AGENT_NETWORK_ROOT = "/agent-network";
export const NETWORKING_HOME = "/peers";

/** The product a route belongs to. */
export const productForPath = (path?: string | null): Product => {
  if (!path) return "networking";
  return path === AGENT_NETWORK_ROOT ||
    path.startsWith(`${AGENT_NETWORK_ROOT}/`)
    ? "agent-network"
    : "networking";
};

type Grant = { read?: boolean } | undefined;
type AgentNetworkPermissions = {
  "agent_network.providers"?: Grant;
  "agent_network.policies"?: Grant;
  "agent_network.usage"?: Grant;
  "agent_network.logs"?: Grant;
  "agent_network.settings"?: Grant;
};

/**
 * Any agent_network grant at all; the delegated roles (agent_network_admin,
 * usage_viewer) each hold a subset of these.
 */
export const hasAgentNetworkGrant = (permission?: AgentNetworkPermissions) =>
  !!permission?.["agent_network.providers"]?.read ||
  !!permission?.["agent_network.policies"]?.read ||
  !!permission?.["agent_network.usage"]?.read ||
  !!permission?.["agent_network.logs"]?.read ||
  !!permission?.["agent_network.settings"]?.read;

/**
 * Where switching to Agent Network lands: the same page the sidebar's
 * Agent Network entry opens.
 */
export const agentNetworkHome = (permission?: AgentNetworkPermissions) =>
  permission?.["agent_network.providers"]?.read
    ? `${AGENT_NETWORK_ROOT}/providers`
    : `${AGENT_NETWORK_ROOT}/connect`;

type SwitchInput = {
  /** The Agent Network surface exists for this deployment or account. */
  enabled: boolean;
  /** The dashboard is focused on Agent Network only; there is nothing to switch to. */
  only: boolean;
  /** The caller can see at least one Agent Network page. */
  hasAccess: boolean;
};

/** The switch shows when both products are there for the caller. */
export const showProductSwitch = ({ enabled, only, hasAccess }: SwitchInput) =>
  enabled && !only && hasAccess;

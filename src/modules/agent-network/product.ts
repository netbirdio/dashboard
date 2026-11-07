/**
 * The dashboard holds two products: Networking (peers, access control,
 * networks, DNS, reverse proxy) and Agent Network. Agent Network pages and
 * the pages only Networking has decide the product; the pages both show
 * (Control Center, Peers, Access Control, Team, Settings and the like) keep
 * the product the caller is in, so opening Peers from the Agent Network view
 * stays in Agent Network.
 */
export type Product = "networking" | "agent-network";

export const AGENT_NETWORK_ROOT = "/agent-network";
export const NETWORKING_HOME = "/peers";

/** The sections the Agent Network view hides, so they belong to Networking. */
export const NETWORKING_ONLY_ROOTS = [
  "/networks",
  "/network",
  "/network-routes",
  "/reverse-proxy",
  "/dns",
  "/events",
];

const isUnder = (path: string, root: string) =>
  path === root || path.startsWith(`${root}/`);

/**
 * The product a route belongs to. A page both products show keeps
 * `current`, the product the caller is in (Networking when there is none).
 */
export const productForPath = (
  path?: string | null,
  current?: Product,
): Product => {
  if (path && isUnder(path, AGENT_NETWORK_ROOT)) return "agent-network";
  if (path && NETWORKING_ONLY_ROOTS.some((root) => isUnder(path, root)))
    return "networking";
  return current ?? "networking";
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

/**
 * The sidebar is one list for the whole account (navigation option B):
 *
 * - pages both products use sit at the top: Control Center and Peers;
 * - each product is a collapsible section: Networking and Agent Network;
 * - the account area closes the list: Team, Audit Events, Settings,
 *   Integrations and Documentation.
 *
 * A page has one URL but may be listed in more than one section (Groups is
 * both Account › Team › Groups and Networking › Access Control › Groups).
 * Every section that lists the current page opens and is highlighted, and
 * every entry for it is active.
 */

export type NavSectionId = "networking" | "agent-network" | "account";

export const NAV_SECTIONS: readonly NavSectionId[] = [
  "networking",
  "agent-network",
  "account",
];

/** The product sections; the account area is always there. */
export const PRODUCT_SECTIONS: readonly NavSectionId[] = [
  "networking",
  "agent-network",
];

/**
 * The route roots each section lists. A root covers itself and everything
 * below it, so "/dns" covers "/dns/zones" but not "/dnssec". Detail pages
 * that live outside their list's root ("/group", "/network") are listed too.
 * Control Center and Peers belong to no section: they serve both products.
 */
export const NAV_SECTION_ROUTES: Record<NavSectionId, readonly string[]> = {
  networking: [
    "/access-control",
    "/posture-checks",
    "/groups",
    "/group",
    "/networks",
    "/network",
    "/network-routes",
    "/reverse-proxy",
    "/dns",
    "/events/traffic",
  ],
  "agent-network": ["/agent-network"],
  account: [
    "/team",
    "/groups",
    "/group",
    "/events/audit",
    "/settings",
    "/integrations",
    "/tenants",
  ],
};

/** True when `path` is `root` or a page below it. */
export const isUnder = (path: string | null | undefined, root: string) =>
  !!path && (path === root || path.startsWith(`${root}/`));

/** Every section that lists the page at `path`, in sidebar order. */
export const sectionsForPath = (path?: string | null): NavSectionId[] =>
  NAV_SECTIONS.filter((id) =>
    NAV_SECTION_ROUTES[id].some((root) => isUnder(path, root)),
  );

type Grant = { read?: boolean } | undefined;

/** The permission modules the sidebar reads; usePermissions().permission fits it. */
export type NavPermissions = Partial<
  Record<
    | "policies"
    | "groups"
    | "networks"
    | "routes"
    | "services"
    | "dns"
    | "nameservers"
    | "events"
    | "users"
    | "settings"
    | "agent_network.providers"
    | "agent_network.policies"
    | "agent_network.usage"
    | "agent_network.logs"
    | "agent_network.settings",
    Grant
  >
>;

const can = (
  permission: NavPermissions | undefined,
  module: keyof NavPermissions,
) => !!permission?.[module]?.read;

/**
 * Any agent_network grant at all; the delegated roles (agent_network_admin,
 * usage_viewer) each hold a subset of these.
 */
export const hasAgentNetworkGrant = (permission?: NavPermissions) =>
  can(permission, "agent_network.providers") ||
  can(permission, "agent_network.policies") ||
  can(permission, "agent_network.usage") ||
  can(permission, "agent_network.logs") ||
  can(permission, "agent_network.settings");

/** The caller can read at least one page of the Networking section. */
export const hasNetworkingAccess = (permission?: NavPermissions) =>
  can(permission, "policies") ||
  can(permission, "groups") ||
  can(permission, "networks") ||
  can(permission, "routes") ||
  can(permission, "services") ||
  can(permission, "dns") ||
  can(permission, "nameservers") ||
  can(permission, "events");

export type AgentNetworkPageAccess = {
  insights: boolean;
  usage: boolean;
  connect: boolean;
  providers: boolean;
  policies: boolean;
  configuration: boolean;
};

/**
 * Which Agent Network pages the caller sees. Each page tracks its
 * agent_network submodule, so delegated roles see exactly what their grants
 * cover. `configured` is the caller's own setup: a policy grants them at
 * least one provider, which is enough for Connect Agent and the self-scoped
 * Usage & Logs, even without any agent_network permission. Insights reads
 * the same data as Usage & Logs, but account-wide, so it needs the grant;
 * the pages don't exist yet and only show while `insights` is switched on.
 */
export const agentNetworkPageAccess = ({
  permission,
  configured,
  insights,
}: {
  permission?: NavPermissions;
  configured: boolean;
  insights: boolean;
}): AgentNetworkPageAccess => {
  const usageGrant =
    can(permission, "agent_network.usage") ||
    can(permission, "agent_network.logs");
  return {
    insights: insights && usageGrant,
    usage: usageGrant || configured,
    connect: configured || hasAgentNetworkGrant(permission),
    providers: can(permission, "agent_network.providers"),
    policies: can(permission, "agent_network.policies"),
    configuration: can(permission, "agent_network.settings"),
  };
};

export type NavSectionInput = {
  /** The account or deployment is focused on Agent Network (`agent_network_only`). */
  agentNetworkOnly: boolean;
  /** Agent Network exists for this deployment or account. */
  agentNetworkEnabled: boolean;
  /** The caller can open at least one Agent Network page. */
  agentNetworkAccess: boolean;
  /** The caller can open at least one Networking page. */
  networkingAccess: boolean;
};

/**
 * Networking is gone from accounts focused on Agent Network, and from
 * callers who can't open any of its pages.
 */
export const showNetworkingSection = ({
  agentNetworkOnly,
  networkingAccess,
}: NavSectionInput) => !agentNetworkOnly && networkingAccess;

/**
 * Agent Network is gone where the product is off, whatever the caller may
 * hold, and from callers who can't open any of its pages.
 */
export const showAgentNetworkSection = ({
  agentNetworkEnabled,
  agentNetworkAccess,
}: NavSectionInput) => agentNetworkEnabled && agentNetworkAccess;

/** The sections the sidebar shows, in order. The account area always stays. */
export const visibleSections = (input: NavSectionInput): NavSectionId[] =>
  NAV_SECTIONS.filter((id) => {
    if (id === "networking") return showNetworkingSection(input);
    if (id === "agent-network") return showAgentNetworkSection(input);
    return true;
  });

/** Open (true) or closed (false) per section; a section never toggled is open. */
export type NavSectionState = Partial<Record<NavSectionId, boolean>>;

/** Section state per user id, as kept in localStorage. */
export type StoredNavSections = Record<string, NavSectionState>;

export const NAV_SECTIONS_STORAGE_KEY = "netbird-nav-sections";

export const isSectionOpen = (
  state: NavSectionState | undefined,
  id: NavSectionId,
) => state?.[id] ?? true;

/**
 * The stored state with `ids` opened for `user`. Returns the same object
 * when they are open already, so callers can skip the write.
 */
export const openSections = (
  stored: StoredNavSections | undefined,
  user: string,
  ids: readonly NavSectionId[],
): StoredNavSections => {
  const current = stored ?? {};
  const mine = current[user] ?? {};
  const closed = ids.filter((id) => !isSectionOpen(mine, id));
  if (closed.length === 0) return current;
  const next: NavSectionState = { ...mine };
  closed.forEach((id) => (next[id] = true));
  return { ...current, [user]: next };
};

/** The stored state with one section of `user` set open or closed. */
export const setSectionOpen = (
  stored: StoredNavSections | undefined,
  user: string,
  id: NavSectionId,
  open: boolean,
): StoredNavSections => {
  const current = stored ?? {};
  return { ...current, [user]: { ...current[user], [id]: open } };
};

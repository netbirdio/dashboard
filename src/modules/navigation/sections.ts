/**
 * The sidebar is one list for the whole account:
 *
 * - what both products work with sits at the top, with no heading: Control
 *   Center, Peers, Users and Groups;
 * - each product is a collapsible section: Networking and Agent Network;
 * - the account area closes the list: Settings, Integrations and Audit
 *   Events. Service Users is a tab on the Users page, and Documentation
 *   is in the header's help menu.
 *
 * Every page has one URL and one entry. The section that lists the current
 * page opens and is highlighted. Should a page ever be listed in two
 * sections, both would open and highlight: sectionsForPath returns them all.
 */

export type NavSectionId = "networking" | "agent-network" | "account";

export const NAV_SECTIONS: readonly NavSectionId[] = [
  "networking",
  "agent-network",
  "account",
];

/**
 * The route roots each section lists. A root covers itself and everything
 * below it, so "/dns" covers "/dns/zones" but not "/dnssec". Detail pages
 * that live outside their list's root ("/network") are listed too.
 * Control Center, Peers, Users ("/team/users", its Service Users tab and
 * "/team/user") and Groups ("/groups", "/group") belong to no section: they
 * serve both products.
 */
export const NAV_SECTION_ROUTES: Record<NavSectionId, readonly string[]> = {
  networking: [
    "/access-control",
    "/posture-checks",
    "/networks",
    "/network",
    "/network-routes",
    "/reverse-proxy",
    "/dns",
    "/events/traffic",
  ],
  "agent-network": ["/agent-network"],
  account: ["/settings", "/integrations", "/events/audit", "/tenants"],
};

/**
 * The pages an entry stands for besides its own list page, so it stays
 * active there (SidebarItem `activeRoutes`): a list's detail page, or a
 * page reached through tabs on it.
 */
export const USERS_ACTIVE_ROUTES: readonly string[] = [
  "/team/service-users",
  "/team/user",
];
export const PEERS_ACTIVE_ROUTES: readonly string[] = ["/peer"];
export const GROUPS_ACTIVE_ROUTES: readonly string[] = ["/group"];
export const NETWORKS_ACTIVE_ROUTES: readonly string[] = ["/network"];

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
    | "edr"
    | "idp"
    | "event_streaming"
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
  can(permission, "networks") ||
  can(permission, "routes") ||
  can(permission, "services") ||
  can(permission, "dns") ||
  can(permission, "nameservers") ||
  can(permission, "events");

export type AgentNetworkPageAccess = {
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
 * Usage & Logs, even without any agent_network permission.
 */
export const agentNetworkPageAccess = ({
  permission,
  configured,
}: {
  permission?: NavPermissions;
  configured: boolean;
}): AgentNetworkPageAccess => {
  const usageGrant =
    can(permission, "agent_network.usage") ||
    can(permission, "agent_network.logs");
  return {
    usage: usageGrant || configured,
    connect: configured || hasAgentNetworkGrant(permission),
    providers: can(permission, "agent_network.providers"),
    policies: can(permission, "agent_network.policies"),
    configuration: can(permission, "agent_network.settings"),
  };
};

export type AccountPageAccess = {
  settings: boolean;
  integrations: boolean;
  auditEvents: boolean;
};

/**
 * Which account-area pages the caller sees. Integrations needs one of its
 * integration grants; self-hosted, Settings readers manage them too.
 * Tenants (MSPs) is decided by MSPNavigationItem and needs an owner or
 * admin, who can always read Settings, so it never stands alone here.
 */
export const accountPageAccess = ({
  permission,
  cloud,
}: {
  permission?: NavPermissions;
  cloud: boolean;
}): AccountPageAccess => ({
  settings: can(permission, "settings"),
  integrations:
    can(permission, "edr") ||
    can(permission, "idp") ||
    can(permission, "event_streaming") ||
    (!cloud && can(permission, "settings")),
  auditEvents: can(permission, "events"),
});

export type NavSectionInput = {
  /** The account or deployment is focused on Agent Network (`agent_network_only`). */
  agentNetworkOnly: boolean;
  /** Agent Network exists for this deployment or account. */
  agentNetworkEnabled: boolean;
  /** The caller can open at least one Agent Network page. */
  agentNetworkAccess: boolean;
  /** The caller can open at least one Networking page. */
  networkingAccess: boolean;
  /** The caller can open at least one account-area page. */
  accountAccess: boolean;
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

/**
 * The account area serves both products, so it shows whichever products
 * are on; it is gone only for callers who can open none of its pages
 * (the user role, delegated Agent Network roles), instead of standing there
 * as an empty heading.
 */
export const showAccountSection = ({ accountAccess }: NavSectionInput) =>
  accountAccess;

/** The sections the sidebar shows, in order. */
export const visibleSections = (input: NavSectionInput): NavSectionId[] =>
  NAV_SECTIONS.filter((id) => {
    if (id === "networking") return showNetworkingSection(input);
    if (id === "agent-network") return showAgentNetworkSection(input);
    return showAccountSection(input);
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

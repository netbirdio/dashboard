/**
 * The dashboard holds two products: Networking (access control, networks,
 * reverse proxy, DNS, traffic events) and Agent Network (the AI agent
 * gateway). Every route either belongs to one product or is shared:
 *
 * - `/agent-network/…` is Agent Network;
 * - the routes in NETWORKING_ROOTS are Networking;
 * - everything else (Control Center, Peers, Team, Groups, Audit Events,
 *   Settings, Integrations, …) is shared and has one URL for both products.
 *
 * A shared page carries the product it was opened from in its URL, as
 * `?product=networking` or `?product=agent-network`, so a copied link, a
 * bookmark and a new tab all open it in the same product. Without the
 * parameter (an old bookmark, a link from the docs) it opens in the product
 * the user was last in, and the URL is then rewritten to name it.
 */
export type Product = "networking" | "agent-network";
export type RouteOwner = Product | "shared";

export const PRODUCTS: readonly Product[] = ["networking", "agent-network"];
export const PRODUCT_NAMES: Record<Product, string> = {
  networking: "Networking",
  "agent-network": "Agent Network",
};

/** The query parameter that names the product of a shared page. */
export const PRODUCT_PARAM = "product";

export const AGENT_NETWORK_ROOT = "/agent-network";
export const NETWORKING_HOME = "/peers";

/** The routes only Networking has. */
export const NETWORKING_ROOTS = [
  "/access-control",
  "/posture-checks",
  "/networks",
  "/network",
  "/network-routes",
  "/reverse-proxy",
  "/dns",
  "/events/traffic",
  "/events/proxy",
];

const isUnder = (path: string, root: string) =>
  path === root || path.startsWith(`${root}/`);

export const isProduct = (value: unknown): value is Product =>
  value === "networking" || value === "agent-network";

/** The product named by a `?product=` value, if it names one. */
export const parseProduct = (value?: string | null): Product | undefined =>
  isProduct(value) ? value : undefined;

/** Which product a route belongs to, or "shared" when both show it. */
export const routeOwner = (path?: string | null): RouteOwner => {
  if (!path) return "shared";
  if (isUnder(path, AGENT_NETWORK_ROOT)) return "agent-network";
  if (NETWORKING_ROOTS.some((root) => isUnder(path, root))) return "networking";
  return "shared";
};

type Mode = {
  /** Both products are there for the caller, so the header has the switch. */
  switchable: boolean;
  /** The account or deployment is Agent Network only. */
  only: boolean;
};

type ResolveInput = Mode & {
  path?: string | null;
  /** The `?product=` value of the current URL. */
  param?: string | null;
  /** The product the user was last in, from localStorage. */
  remembered?: Product;
};

/**
 * The product the caller is in. Without the switch there is one product:
 * Agent Network on an Agent Network only dashboard, Networking otherwise.
 * With it, a route that belongs to a product decides; a shared page takes
 * its `?product=`, then the product the user was last in, then Networking.
 */
export const resolveProduct = ({
  path,
  param,
  remembered,
  switchable,
  only,
}: ResolveInput): Product => {
  if (only) return "agent-network";
  if (!switchable) return "networking";
  const owner = routeOwner(path);
  if (owner !== "shared") return owner;
  return parseProduct(param) ?? remembered ?? "networking";
};

/**
 * A link to `href` in `product`: shared pages get `?product=`, the pages of
 * one product and external links stay as they are.
 */
export const productHref = (href: string, product: Product) => {
  if (!href.startsWith("/")) return href;
  const hashAt = href.indexOf("#");
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const rest = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = rest.indexOf("?");
  const path = queryAt === -1 ? rest : rest.slice(0, queryAt);
  if (routeOwner(path) !== "shared") return href;
  const params = new URLSearchParams(queryAt === -1 ? "" : rest.slice(queryAt));
  params.set(PRODUCT_PARAM, product);
  return `${path}?${params.toString()}${hash}`;
};

/**
 * The query string the current URL should have so it names `product`, or
 * undefined when it already does. Shared pages carry `?product=`; the pages
 * of one product never do, so each of them keeps a single URL.
 */
export const canonicalSearch = (
  path: string,
  search: string,
  product: Product,
): string | undefined => {
  const params = new URLSearchParams(search);
  const current = params.get(PRODUCT_PARAM);
  if (routeOwner(path) === "shared") {
    if (current === product) return undefined;
    params.set(PRODUCT_PARAM, product);
  } else {
    if (current === null) return undefined;
    params.delete(PRODUCT_PARAM);
  }
  return params.toString();
};

/**
 * The product the breadcrumb trail starts with, or undefined for none.
 * Agent Network pages start their trail with "Agent Network" themselves.
 * Networking pages get "Networking" while there is a second product to
 * tell it from, and shared pages name the product they are in whenever
 * Agent Network is there at all.
 */
export const crumbProduct = ({
  path,
  product,
  switchable,
  only,
}: Mode & { path?: string | null; product: Product }):
  | Product
  | undefined => {
  const owner = routeOwner(path);
  if (owner === "agent-network") return undefined;
  if (owner === "networking") return switchable ? "networking" : undefined;
  return switchable || only ? product : undefined;
};

type Grant = { read?: boolean } | undefined;
export type AgentNetworkPermissions = {
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

/** Where Agent Network starts: Providers, or Connect Agent without them. */
export const agentNetworkHome = (permission?: AgentNetworkPermissions) =>
  permission?.["agent_network.providers"]?.read
    ? `${AGENT_NETWORK_ROOT}/providers`
    : `${AGENT_NETWORK_ROOT}/connect`;

/** Where switching to each product, or the logo, lands. */
export const productHomes = (
  permission?: AgentNetworkPermissions,
): Record<Product, string> => ({
  networking: productHref(NETWORKING_HOME, "networking"),
  "agent-network": agentNetworkHome(permission),
});

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

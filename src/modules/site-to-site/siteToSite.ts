import { Group, GroupPeer } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import type { SiteToSiteScope } from "@/modules/access-control/AccessControlModal";

export const SITE_TO_SITE_DOCS_LINK =
  "https://docs.netbird.io/use-cases/remote-access/site-to-site";

/** The resources the network lists, in the order of the resource list. */
export const resourcesOfNetwork = (
  network: Network | undefined,
  resources: NetworkResource[] | undefined,
): NetworkResource[] =>
  network && resources
    ? resources.filter((r) => network.resources?.includes(r.id))
    : [];

/** A source is matched by address, so domains can only be destinations. */
const canBeSource = (resource: NetworkResource) => resource.type !== "domain";

/**
 * The resource a new policy starts from on one side: the network's first IP
 * range, else its first address. A destination may fall back to a domain.
 */
export const defaultSiteResource = (
  network: Network | undefined,
  resources: NetworkResource[] | undefined,
  side: "source" | "destination",
): NetworkResource | undefined => {
  const own = resourcesOfNetwork(network, resources);
  return (
    own.find((r) => r.type === "subnet") ??
    own.find((r) => r.type === "host") ??
    (side === "destination" ? own[0] : undefined)
  );
};

/** True when the network has an IP range or address a policy can start from. */
export const hasAddressResource = (
  network: Network | undefined,
  resources: NetworkResource[] | undefined,
) => !!defaultSiteResource(network, resources, "source");

export const toRuleResource = (
  resource: NetworkResource,
): PolicyRuleResource => ({ id: resource.id, type: resource.type });

/** Limits each side of the policy modal to the resources of its network. */
export const siteToSiteScope = (
  source: Network,
  destination: Network,
  resources: NetworkResource[] | undefined,
): SiteToSiteScope => ({
  sourceResourceIds: resourcesOfNetwork(source, resources)
    .filter(canBeSource)
    .map((r) => r.id),
  destinationResourceIds: resourcesOfNetwork(destination, resources).map(
    (r) => r.id,
  ),
});

export const proposedPolicyName = (source: Network, destination: Network) =>
  `${source.name} to ${destination.name}`;

/** The connection's networks in its own order, skipping unknown ones. */
export const connectionNetworks = (
  connection: SiteToSiteConnection,
  networks: Network[] | undefined,
): Network[] =>
  connection.network_ids
    .map((id) => networks?.find((n) => n.id === id))
    .filter((n): n is Network => !!n);

export const connectionPolicies = (
  connection: SiteToSiteConnection,
  policies: Policy[] | undefined,
): Policy[] =>
  connection.policy_ids
    .map((id) => policies?.find((p) => p.id === id))
    .filter((p): p is Policy => !!p);

/** A stable row id for a connection, whatever order its networks are in. */
export const connectionKey = (connection: SiteToSiteConnection) =>
  [...connection.network_ids].sort().join(":");

/**
 * The networks a policy's first rule goes from and to, so editing it can
 * limit each side to its own network.
 */
export const policySiteNetworks = (
  policy: Policy,
  networks: Network[] | undefined,
): { source?: Network; destination?: Network } => {
  const rule = policy.rules?.[0];
  const networkOf = (id?: string) =>
    id ? networks?.find((n) => n.resources?.includes(id)) : undefined;
  return {
    source: networkOf(rule?.sourceResource?.id),
    destination: networkOf(rule?.destinationResource?.id),
  };
};

/** Peers the network's enabled routers name directly or through a group. */
export const networkRoutingPeers = (
  network: Network,
  routers: NetworkRouter[] | undefined,
  groups: Group[] | undefined,
  peers: Peer[] | undefined,
): Peer[] => {
  const ids = new Set<string>();
  routers
    ?.filter((r) => r.enabled && network.routers?.includes(r.id))
    .forEach((router) => {
      if (router.peer) ids.add(router.peer);
      router.peer_groups?.forEach((groupId) => {
        const group = groups?.find((g) => g.id === groupId);
        (group?.peers as (GroupPeer | string)[] | undefined)?.forEach((p) =>
          ids.add(typeof p === "string" ? p : p.id),
        );
      });
    });
  return peers?.filter((p) => p.id && ids.has(p.id)) ?? [];
};

/** Country codes of the connected peers, once each, in peer order. */
export const peerCountries = (peers: Peer[]): string[] => [
  ...new Set(
    peers.filter((p) => p.connected && p.country_code).map((p) => p.country_code),
  ),
];

/** The name a routing peer for the network registers with, e.g. router-berlin-office. */
export const routingPeerHostname = (network: Network) => {
  const slug = network.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `router-${slug || "network"}`.slice(0, 63).replace(/-+$/, "");
};

/** A hostname of letters, digits and dashes, as a routing peer registers with. */
export const validRoutingPeerHostname = (hostname: string) =>
  hostname === "" ||
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(hostname.trim());

/** The group whose members route for the network. */
export const routingPeerGroupName = (network: Network) =>
  `${network.name} Routing Peers`;

/** One pair of resources a connection's policies join. */
export type SiteLink = {
  key: string;
  // The resource in the connection's first network, then in its second.
  a: NetworkResource;
  b: NetworkResource;
  bidirectional: boolean;
  // Traffic only goes from b to a.
  reverse: boolean;
  policies: Policy[];
  enabled: boolean;
};

/**
 * Groups a connection's policies by the pair of resources they join, with
 * the direction traffic takes once all of them are counted.
 */
export const connectionLinks = (
  connection: SiteToSiteConnection,
  policies: Policy[] | undefined,
  networks: Network[] | undefined,
  resources: NetworkResource[] | undefined,
): SiteLink[] => {
  const networkA = networks?.find((n) => n.id === connection.network_ids[0]);
  const byKey = new Map<
    string,
    SiteLink & { forward: boolean; backward: boolean }
  >();

  connectionPolicies(connection, policies).forEach((policy) => {
    policy.rules?.forEach((rule) => {
      const src = resources?.find((r) => r.id === rule.sourceResource?.id);
      const dst = resources?.find((r) => r.id === rule.destinationResource?.id);
      if (!src || !dst) return;
      const srcInA = !!networkA?.resources?.includes(src.id);
      const [a, b] = srcInA ? [src, dst] : [dst, src];
      const key = `${a.id}:${b.id}`;
      const link = byKey.get(key) ?? {
        key,
        a,
        b,
        bidirectional: false,
        reverse: false,
        policies: [],
        enabled: false,
        forward: false,
        backward: false,
      };
      if (!link.policies.includes(policy)) link.policies.push(policy);
      link.forward ||= srcInA || rule.bidirectional;
      link.backward ||= !srcInA || rule.bidirectional;
      link.enabled ||= policy.enabled && rule.enabled;
      byKey.set(key, link);
    });
  });

  return [...byKey.values()].map(({ forward, backward, ...link }) => ({
    ...link,
    bidirectional: forward && backward,
    reverse: backward && !forward,
  }));
};

import { Network, NetworkResource } from "@/interfaces/Network";

export type NetworkResourceInNetwork = NetworkResource & {
  networkId?: string;
  networkName?: string;
};

/** The network that lists the resource, if any. */
export const findResourceNetwork = (
  resourceId: string,
  networks?: Network[],
): Network | undefined =>
  networks?.find((n) => n.resources?.includes(resourceId));

/**
 * Tags each resource with its network and orders the list by network name,
 * keeping the original order inside a network. Resources no network lists
 * go last, so a selector can head each run of resources with its network.
 */
export const withNetworkNames = (
  resources: NetworkResource[],
  networks?: Network[],
): NetworkResourceInNetwork[] => {
  const networkOf = new Map<string, Network>();
  networks?.forEach((network) =>
    network.resources?.forEach((id) => networkOf.set(id, network)),
  );

  const tagged = resources.map((resource) => {
    const network = networkOf.get(resource.id);
    return { ...resource, networkId: network?.id, networkName: network?.name };
  });

  return tagged
    .map((resource, index) => ({ resource, index }))
    .sort((a, b) => {
      const an = a.resource.networkName;
      const bn = b.resource.networkName;
      if (an !== bn) {
        if (an === undefined) return 1;
        if (bn === undefined) return -1;
        const byName = an.localeCompare(bn);
        if (byName !== 0) return byName;
      }
      return a.index - b.index;
    })
    .map(({ resource }) => resource);
};

import {
  Network,
  NetworkResource,
  NetworkResourceWithNetwork,
} from "@/interfaces/Network";

/**
 * The account-wide resource list does not say which network a resource is in;
 * each network lists its resource ids instead.
 * A resource whose network is not known (yet) is left out,
 * because every row action needs the network to build its request.
 */
export const resourcesWithNetwork = (
  resources?: NetworkResource[],
  networks?: Network[],
): NetworkResourceWithNetwork[] => {
  if (!resources || !networks) return [];
  const networkByResourceId = new Map<string, Network>();
  for (const network of networks) {
    for (const resourceId of network.resources ?? []) {
      networkByResourceId.set(resourceId, network);
    }
  }
  return resources.flatMap((resource) => {
    const network = networkByResourceId.get(resource.id);
    return network ? [{ ...resource, network }] : [];
  });
};

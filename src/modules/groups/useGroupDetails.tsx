import { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";
import { SetupKey } from "@/interfaces/SetupKey";
import { User } from "@/interfaces/User";
import useFetchApi from "@/utils/api";
import { useMemo } from "react";

export interface GroupDetails extends Group {
  policies: GroupPolices;
  nameservers: NameserverGroup[];
  routes: Route[];
  setupKeys: SetupKey[];
  users: User[];
  peersGroup: Peer[];
  networkResource: NetworkResource[]
}

export interface GroupPolices {
  sources: Policy[],
  destinations: Policy[]
  all: Policy[]
}

export default function useGroupDetails(groupId: string) {
  const { data: group, isLoading: isGroupsLoading } = useFetchApi<Group>(`/groups/${groupId}`);
  const { data: policies, isLoading: isPoliciesLoading } = useFetchApi<Policy[]>(`/policies`);
  const { data: nameservers, isLoading: isNameserversLoading } = useFetchApi<NameserverGroup[]>(`/dns/nameservers`);
  const { data: routes, isLoading: isRoutesLoading } = useFetchApi<Route[]>(`/routes`);
  const { data: setupKeys, isLoading: isSetupKeysLoading } = useFetchApi<SetupKey[]>(`/setup-keys`);
  const { data: users, isLoading: isUsersLoading } = useFetchApi<User[]>(`/users`);
  const { data: peers, isLoading: isPeerLoading } = useFetchApi<Peer[]>(`/peers`);
  //@Eduard : can check the fetching of  network Resource
  const { data: resources, isLoading: isLoadingResources } = useFetchApi<NetworkResource[]>("/networks/resources");


  const linkedPolicies = useMemo(() => {
    const emptyPolicies = { sources: [], destinations: [], all: [] };

    if (isPoliciesLoading) return emptyPolicies;
    if (!policies) return emptyPolicies;

    const sources: Policy[] = [];
    const destinations: Policy[] = [];
    const all: Policy[] = []

    for (const policy of policies) {
      const rules = policy.rules || [];

      for (const rule of rules) {
        const sourceGroups = (rule.sources as Group[]) || [];
        const destinationGroups = (rule.destinations as Group[]) || [];

        const isInSources = sourceGroups.some((g) => g.id === groupId);
        const isInDestinations = destinationGroups.some((g) => g.id === groupId);

        if (isInSources) sources.push(policy);
        if (isInDestinations) destinations.push(policy);
        if (isInSources || isInDestinations) all.push(policy)
      }
    }

    return { sources, destinations, all };
  }, [policies, isPoliciesLoading, groupId]);


  const linkedNameservers = useMemo(() => {
    if (!nameservers) return [];
    return nameservers.filter((ns) => ns.groups?.includes(groupId));
  }, [nameservers, groupId]);

  const linkedRoutes = useMemo(() => {
    if (!routes) return [];
    return routes.filter((route) => route.groups?.includes(groupId));
  }, [routes, groupId]);

  const linkedSetupKeys = useMemo(() => {
    if (!setupKeys) return [];
    return setupKeys.filter((key) => key.auto_groups?.includes(groupId));
  }, [setupKeys, groupId]);

  const linkedUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => user.auto_groups?.includes(groupId));
  }, [users, groupId]);

  const linkedPeers = useMemo(() => {
    if (!peers || !group?.peers) return [];

    const groupPeerIds = (group.peers as GroupPeer[]).map((p) => p.id);
    return peers.filter((p) => groupPeerIds.includes(p.id!));
  }, [peers, group]);

  const linkedNetworkResources = useMemo(() => {
    if (!resources || group?.resources) return [];
    const resourcesId = (group?.resources as GroupResource[])?.map(p => p.id)
    return resources.filter(p => resourcesId.includes(p.id))
  }, [])

  const isLoading =
    isGroupsLoading ||
    isPoliciesLoading ||
    isNameserversLoading ||
    isRoutesLoading ||
    isSetupKeysLoading ||
    isUsersLoading ||
    isPeerLoading ||
    isLoadingResources;

  return useMemo(() => {
    if (isLoading || !group) return null;

    return {
      ...group,
      policies: linkedPolicies,
      nameservers: linkedNameservers,
      routes: linkedRoutes,
      setupKeys: linkedSetupKeys,
      users: linkedUsers,
      peersGroup: linkedPeers,
      networkResource: linkedNetworkResources,
    } as GroupDetails;
  }, [isLoading, group, linkedPolicies, linkedNameservers, linkedRoutes, linkedSetupKeys, linkedUsers]);
}

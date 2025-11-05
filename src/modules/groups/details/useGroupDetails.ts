import { useMemo } from "react";
import { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";
import {
  Network,
  NetworkResource,
  NetworkResourceWithNetwork,
} from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";
import { SetupKey } from "@/interfaces/SetupKey";
import { User } from "@/interfaces/User";
import useFetchApi from "@/utils/api";

export interface GroupDetails extends Group {
  policies: Policy[];
  nameservers: NameserverGroup[];
  routes: Route[];
  setupKeys: SetupKey[];
  users: User[];
  peersOfGroup: Peer[];
  networkResources: NetworkResourceWithNetwork[];
}

export default function useGroupDetails(groupId: string) {
  const { data: group, isLoading: isGroupsLoading } = useFetchApi<Group>(
    `/groups/${groupId}`,
  );
  const { data: policies, isLoading: isPoliciesLoading } =
    useFetchApi<Policy[]>(`/policies`);
  const { data: nameservers, isLoading: isNameserversLoading } =
    useFetchApi<NameserverGroup[]>(`/dns/nameservers`);
  const { data: routes, isLoading: isRoutesLoading } =
    useFetchApi<Route[]>(`/routes`);
  const { data: setupKeys, isLoading: isSetupKeysLoading } =
    useFetchApi<SetupKey[]>(`/setup-keys`);
  const { data: users, isLoading: isUsersLoading } = useFetchApi<User[]>(
    `/users?service_user=false`,
  );
  const { data: peers, isLoading: isPeerLoading } =
    useFetchApi<Peer[]>(`/peers`);
  const { data: resources, isLoading: isLoadingResources } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: networks, isLoading: isNetworksLoading } =
    useFetchApi<Network[]>("/networks");

  const linkedPolicies = useMemo(() => {
    return (
      policies?.filter((policy) => {
        let rule = policy.rules?.[0] ?? undefined;
        const sourceGroups = (rule.sources as Group[]) || [];
        const destinationGroups = (rule.destinations as Group[]) || [];
        const isInSources = sourceGroups.some((g) => g.id === groupId);
        const isInDestinations = destinationGroups.some(
          (g) => g.id === groupId,
        );
        return isInSources || isInDestinations;
      }) || []
    );
  }, [policies, groupId]);

  const linkedNameservers = useMemo(() => {
    return nameservers?.filter((ns) => ns.groups?.includes(groupId)) || [];
  }, [nameservers, groupId]);

  const linkedRoutes = useMemo(() => {
    return (
      routes?.filter((route) => {
        const isInDistributionGroups = route.groups?.includes(groupId);
        const isInAccessControlGroups =
          route.access_control_groups?.includes(groupId);
        const isInPeerGroups = route.peer_groups?.includes(groupId);

        return (
          isInAccessControlGroups || isInDistributionGroups || isInPeerGroups
        );
      }) || []
    );
  }, [routes, groupId]);

  const linkedSetupKeys = useMemo(() => {
    return setupKeys?.filter((key) => key.auto_groups?.includes(groupId)) || [];
  }, [setupKeys, groupId]);

  const linkedUsers = useMemo(() => {
    return users?.filter((user) => user.auto_groups?.includes(groupId)) || [];
  }, [users, groupId]);

  const linkedPeers = useMemo(() => {
    const groupPeerIds = (group?.peers as GroupPeer[])?.map((p) => p.id);
    return peers?.filter((p) => groupPeerIds?.includes(p.id!)) || [];
  }, [peers, group]);

  const linkedNetworkResources = useMemo(() => {
    if (!resources || !group?.resources) return [];
    const resourcesIds = (group?.resources as GroupResource[])?.map(
      (p) => p.id,
    );
    let networkResources = resources.filter(
      (p) => resourcesIds?.includes(p.id),
    );

    return networkResources.map((networkResource) => {
      const network = networks?.find(
        (n) => n.resources?.includes(networkResource.id),
      );
      return {
        ...networkResource,
        network: network,
      } as NetworkResourceWithNetwork;
    });
  }, [group?.resources, networks, resources]);

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
      peersOfGroup: linkedPeers,
      networkResources: linkedNetworkResources,
    } as GroupDetails;
  }, [
    isLoading,
    group,
    linkedPolicies,
    linkedNameservers,
    linkedRoutes,
    linkedSetupKeys,
    linkedUsers,
    linkedPeers,
    linkedNetworkResources,
  ]);
}

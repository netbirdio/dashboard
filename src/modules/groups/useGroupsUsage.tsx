import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { DNSZone } from "@/interfaces/DNS";
import { Group } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";
import { SetupKey } from "@/interfaces/SetupKey";
import { User } from "@/interfaces/User";

export interface GroupUsage extends Group {
  peers_count: number;
  policies_count: number;
  nameservers_count: number;
  zones_count: number;
  routes_count: number;
  setup_keys_count: number;
  users_count: number;
  resources_count: number;
}

export default function useGroupsUsage() {
  const { data: groups, isLoading: isGroupsLoading } =
    useFetchApi<Group[]>(`/groups`); // Groups, Peers count
  const { data: policies, isLoading: isPoliciesLoading } =
    useFetchApi<Policy[]>(`/policies`); // Policies
  const { data: nameservers, isLoading: isNameserversLoading } =
    useFetchApi<NameserverGroup[]>(`/dns/nameservers`); // DNS
  const { data: zones, isLoading: isZonesLoading } =
    useFetchApi<DNSZone[]>(`/dns/zones`); // DNS Zones
  const { data: routes, isLoading: isRoutesLoading } =
    useFetchApi<Route[]>(`/routes`); // Routes
  const { data: setupKeys, isLoading: isSetupKeysLoading } =
    useFetchApi<SetupKey[]>(`/setup-keys`); // Setup Keys
  const { data: users, isLoading: isUsersLoading } =
    useFetchApi<User[]>(`/users`); // Users

  const policiesGroups = useMemo(() => {
    if (isPoliciesLoading) return [];
    if (!policies) return [];
    return policies
      ?.map((policy) => {
        const sourceGroups = policy.rules[0].sources as Group[];
        const destinationGroups = policy.rules[0].destinations as Group[];
        const sourceGroupsIds = sourceGroups
          ? sourceGroups.map((group) => group.id)
          : [];
        const destinationGroupsIds = destinationGroups
          ? destinationGroups.map((group) => group.id)
          : [];
        return [...sourceGroupsIds, ...destinationGroupsIds];
      })
      .filter((u) => u !== undefined);
  }, [policies, isPoliciesLoading]);

  const nameserversGroups = useMemo(() => {
    if (isNameserversLoading) return;
    if (!nameservers) return [];
    return nameservers
      ?.map((nameserver) => nameserver.groups)
      .filter((u) => u !== undefined);
  }, [nameservers, isNameserversLoading]);

  const zonesGroups = useMemo(() => {
    if (isZonesLoading) return;
    if (!zones) return [];
    return zones
      ?.map((zone) => zone.distribution_groups)
      .filter((u) => u !== undefined);
  }, [zones, isZonesLoading]);

  const setupKeysGroups = useMemo(() => {
    if (isSetupKeysLoading) return;
    if (!setupKeys) return [];
    return setupKeys
      ?.map((setupKey) => setupKey.auto_groups)
      .filter((u) => u !== undefined);
  }, [setupKeys, isSetupKeysLoading]);

  const usersGroups = useMemo(() => {
    if (isUsersLoading) return;
    if (!users) return [];
    return users
      ?.map((user) => user.auto_groups)
      .filter((u) => u !== undefined);
  }, [users, isUsersLoading]);

  const isLoading = useMemo(() => {
    return (
      isGroupsLoading ||
      isPoliciesLoading ||
      isNameserversLoading ||
      isZonesLoading ||
      isRoutesLoading ||
      isSetupKeysLoading ||
      isUsersLoading
    );
  }, [
    isGroupsLoading,
    isPoliciesLoading,
    isNameserversLoading,
    isZonesLoading,
    isRoutesLoading,
    isSetupKeysLoading,
    isUsersLoading,
  ]);

  const groupsUsage = useMemo(() => {
    if (isLoading) return [];
    if (isRoutesLoading) return [];
    if (!groups) return [];
    return groups?.map((group) => {
      const policyCount = policiesGroups?.filter((policy) => {
        return policy.includes(group.id as string);
      }).length;

      const nameserverCount = nameserversGroups?.filter((nameserver) => {
        return nameserver.includes(group.id as string);
      }).length;

      const zonesCount = zonesGroups?.filter((zone) => {
        return zone.includes(group.id as string);
      }).length;

      const routeCount = (
        routes?.filter((route) => {
          const groupId = group.id as string;
          const isInDistributionGroups =
            route.groups?.includes(groupId) ?? false;
          const isInAccessControlGroups =
            route.access_control_groups?.includes(groupId) ?? false;
          const isInPeerGroups = route.peer_groups?.includes(groupId) ?? false;

          return (
            isInAccessControlGroups || isInDistributionGroups || isInPeerGroups
          );
        }) || []
      ).length;

      const setupKeyCount = setupKeysGroups?.filter((setupKey) => {
        return setupKey.includes(group.id as string);
      }).length;

      const userCount = usersGroups?.filter((user) => {
        return user.includes(group.id as string);
      }).length;

      return {
        ...group,
        peers_count: group.peers_count,
        resources_count: group.resources_count,
        policies_count: policyCount,
        nameservers_count: nameserverCount,
        zones_count: zonesCount,
        routes_count: routeCount,
        setup_keys_count: setupKeyCount,
        users_count: userCount,
      } as GroupUsage;
    });
  }, [
    isLoading,
    groups,
    policiesGroups,
    nameserversGroups,
    zonesGroups,
    routes,
    isRoutesLoading,
    setupKeysGroups,
    usersGroups,
  ]);

  return {
    data: groupsUsage,
    isLoading,
  };
}

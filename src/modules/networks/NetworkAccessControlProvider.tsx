import useFetchApi from "@utils/api";
import { orderBy } from "lodash";
import * as React from "react";
import { useCallback, useContext } from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";

type NetworkAccessControlContextValue = {
  policies?: Policy[];
  policiesLoading: boolean;
  resources?: NetworkResource[];
  assignedPolicies: (
    resource?: NetworkResource,
    groups?: Group[],
  ) => {
    policies: Policy[];
    enabledPolicies: Policy[];
    isLoading: boolean;
    policyCount: number;
  };
  resourceExists: (name: string, excludeId?: string) => boolean;
  getPolicyDestinationResources: (policy: Policy) => NetworkResource[];
};

const NetworkAccessControlContext =
  React.createContext<NetworkAccessControlContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export const NetworkAccessControlProvider = ({ children }: Props) => {
  const { data: policies, isLoading: policiesLoading } =
    useFetchApi<Policy[]>("/policies");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );

  const resourceExists = useCallback(
    (name: string, excludeId?: string) => {
      if (!name) return false;
      return !!resources?.find(
        (r) =>
          r.name.toLowerCase() === name.toLowerCase() && r.id !== excludeId,
      );
    },
    [resources],
  );

  const assignedPolicies = useCallback(
    (resource?: NetworkResource, groups?: Group[]) => {
      const resourceGroups = (groups || resource?.groups) as
        | Group[]
        | undefined;
      if (!resource && !resourceGroups?.length) {
        return {
          policies: [],
          enabledPolicies: [],
          isLoading: policiesLoading,
          policyCount: 0,
        };
      }
      const resourcePolicies = orderBy(
        policies?.filter((policy) => {
          const rule = policy.rules?.[0];
          if (!rule) return false;
          if (resource && rule.destinationResource?.id === resource.id)
            return true;
          const destinations = (rule.destinations ?? []) as Group[];
          return resourceGroups?.some((rg) =>
            destinations.some((d) => d?.id === rg.id),
          );
        }),
        "enabled",
        "desc",
      );
      const enabledPolicies = resourcePolicies?.filter(
        (policy) => policy?.enabled,
      );
      return {
        policies: resourcePolicies,
        enabledPolicies,
        isLoading: policiesLoading,
        policyCount: resourcePolicies?.length || 0,
      };
    },
    [policies, policiesLoading],
  );

  const getPolicyDestinationResources = useCallback(
    (policy: Policy): NetworkResource[] => {
      const rule = policy?.rules?.[0];
      const destinationGroups = rule?.destinations as Group[] | undefined;
      const destinationGroupIds = new Set(
        destinationGroups?.map((g) => g.id).filter(Boolean),
      );

      return (
        resources?.filter((resource) => {
          const resourceGroups = resource.groups as
            | (Group | string)[]
            | undefined;
          return resourceGroups?.some((g) => {
            const groupId = typeof g === "string" ? g : g.id;
            return groupId && destinationGroupIds.has(groupId);
          });
        }) ?? []
      );
    },
    [resources],
  );

  return (
    <NetworkAccessControlContext.Provider
      value={{
        policies,
        policiesLoading,
        resources,
        assignedPolicies,
        resourceExists,
        getPolicyDestinationResources,
      }}
    >
      {children}
    </NetworkAccessControlContext.Provider>
  );
};

export const useNetworkAccessControl =
  (): NetworkAccessControlContextValue => {
    const context = useContext(NetworkAccessControlContext);
    if (!context) {
      throw new Error(
        "useNetworkAccessControl must be used within a NetworkAccessControlProvider",
      );
    }
    return context;
  };

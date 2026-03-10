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

const toGroupId = (g: Group | string): string | undefined =>
  typeof g === "string" ? g : g?.id;

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
        | (Group | string)[]
        | undefined;
      if (!resource && !resourceGroups?.length) {
        return {
          policies: [],
          enabledPolicies: [],
          isLoading: policiesLoading,
          policyCount: 0,
        };
      }
      const resourceGroupIds = new Set(
        resourceGroups?.map(toGroupId).filter(Boolean),
      );
      const resourcePolicies = orderBy(
        policies?.filter((policy) => {
          const rule = policy.rules?.[0];
          if (!rule) return false;
          if (resource && rule.destinationResource?.id === resource.id)
            return true;
          const destinations = (rule.destinations ?? []) as (Group | string)[];
          return destinations.some((d) => {
            const destId = toGroupId(d);
            return !!destId && resourceGroupIds.has(destId);
          });
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
      const destinationGroups = rule?.destinations as
        | (Group | string)[]
        | undefined;
      const destinationGroupIds = new Set(
        destinationGroups?.map(toGroupId).filter(Boolean),
      );
      const directDestinationId = rule?.destinationResource?.id;

      return (
        resources?.filter((resource) => {
          if (directDestinationId && resource.id === directDestinationId)
            return true;
          const resourceGroups = resource.groups as
            | (Group | string)[]
            | undefined;
          return resourceGroups?.some((g) => {
            const groupId = toGroupId(g);
            return !!groupId && destinationGroupIds.has(groupId);
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

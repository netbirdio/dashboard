import useFetchApi from "@utils/api";
import { orderBy } from "lodash";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";

export default function useResourcePolicies(resource?: NetworkResource) {
  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");

  const assignedPolicies = useMemo(() => {
    const resourceGroups = resource?.groups as Group[];
    return orderBy(
      policies?.filter((policy) => {
        const destinationResource = policy.rules
          ?.map((rule) => rule?.destinationResource?.id === resource?.id)
          .some((id) => id);
        if (destinationResource) return true;
        const destinationPolicyGroups = policy.rules
          ?.map((rule) => rule?.destinations)
          .flat() as Group[];
        const policyGroups = [...destinationPolicyGroups];
        return resourceGroups?.some((resourceGroup) =>
          policyGroups.some(
            (policyGroup) => policyGroup?.id === resourceGroup.id,
          ),
        );
      }),
      "enabled",
      "desc",
    );
  }, [policies, resource]);

  const enabledPolicies = useMemo(
    () => assignedPolicies?.filter((policy) => policy?.enabled),
    [assignedPolicies],
  );

  return {
    policies: assignedPolicies,
    enabledPolicies,
    isLoading,
    policyCount: assignedPolicies?.length || 0,
  };
}

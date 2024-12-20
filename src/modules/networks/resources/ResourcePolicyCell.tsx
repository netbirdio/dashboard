import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import useFetchApi from "@utils/api";
import { PlusCircle, ShieldIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourcePolicyCell = ({ resource }: Props) => {
  const { openPolicyModal, network } = useNetworksContext();
  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");

  const assignedPolicies = useMemo(() => {
    const resourceGroups = resource?.groups as Group[];
    return policies?.filter((policy) => {
      if (!policy.enabled) return false;
      const sourcePolicyGroups = policy.rules
        ?.map((rule) => rule?.sources)
        .flat() as Group[];
      const destinationPolicyGroups = policy.rules
        ?.map((rule) => rule?.destinations)
        .flat() as Group[];
      const policyGroups = [...sourcePolicyGroups, ...destinationPolicyGroups];
      return resourceGroups.some((resourceGroup) =>
        policyGroups.some((policyGroup) => policyGroup.id === resourceGroup.id),
      );
    });
  }, [policies, resource]);

  if (isLoading) {
    return (
      <div className={"flex gap-3"}>
        <Skeleton height={34} width={220} />
      </div>
    );
  }

  const policyCount = assignedPolicies?.length || 0;

  return (
    network && (
      <div className={"flex gap-3"}>
        {policyCount > 0 && (
          <FullTooltip
            content={
              <div className={"text-xs max-w-lg"}>
                <span className={"font-medium text-nb-gray-100 text-sm"}>
                  Assigned Policies
                </span>
                <div className={"flex gap-2 pt-2 pb-2 flex-wrap"}>
                  {assignedPolicies?.map((policy: Policy, index: number) => {
                    return (
                      <Badge
                        variant={"gray-ghost"}
                        useHover={false}
                        key={index}
                        className={"justify-start font-medium"}
                      >
                        <ShieldIcon size={14} className={"text-green-500"} />
                        {policy.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            }
            interactive={true}
          >
            <Badge variant={"gray"} useHover={true}>
              <ShieldIcon size={14} className={"text-green-500"} />
              <div>
                <span className={"font-medium text-xs"}>
                  {" "}
                  {assignedPolicies?.length}
                </span>
              </div>
            </Badge>
          </FullTooltip>
        )}

        <Button
          size={"xs"}
          variant={"secondary"}
          className={"min-w-[110px]"}
          onClick={() => openPolicyModal(network, resource)}
        >
          <PlusCircle size={12} />
          Add Policy
        </Button>
      </div>
    )
  );
};

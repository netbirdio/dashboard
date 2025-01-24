import MultipleGroups from "@components/ui/MultipleGroups";
import ResourceBadge from "@components/ui/ResourceBadge";
import useFetchApi from "@utils/api";
import React, { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlDestinationsCell({
  policy,
}: Readonly<Props>) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  if (firstRule?.destinationResource) {
    return (
      <AccessControlDestinationResourceCell
        resource={firstRule.destinationResource}
      />
    );
  }

  return firstRule ? (
    <MultipleGroups groups={firstRule.destinations as Group[]} />
  ) : null;
}

const AccessControlDestinationResourceCell = ({
  resource,
}: {
  resource: PolicyRuleResource;
}) => {
  const { data: resources, isLoading } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  if (isLoading) return <Skeleton height={35} width={"50%"} />;

  return (
    <div className={"flex"}>
      <ResourceBadge resource={resources?.find((r) => r.id === resource.id)} />
    </div>
  );
};

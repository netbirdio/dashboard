import { PolicyCountBadge } from "@components/ui/PolicyCountBadge";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourcePolicyCell = ({ resource }: Props) => {
  const { permission } = usePermissions();
  const {
    openResourceModal,
    network,
    openEditPolicyModal,
    assignedPolicies,
    confirmMultiResourceAction,
  } = useNetworksContext();
  const {
    policies: resourcePolicies,
    isLoading,
    policyCount,
  } = assignedPolicies(resource);

  if (isLoading) {
    return (
      <div className={"flex gap-3"}>
        <Skeleton height={34} width={120} />
      </div>
    );
  }

  if (!network) return null;

  return (
    <PolicyCountBadge
      policies={resourcePolicies ?? []}
      policyCount={policyCount}
      canConfigure={!!permission.networks.update}
      onConfigure={() =>
        openResourceModal(network, resource, "access-control")
      }
      onSelectPolicy={async (policy) => {
        const confirm = await confirmMultiResourceAction(
          policy,
          "edit",
          resource,
        );
        if (!confirm) return;
        openEditPolicyModal(policy);
      }}
    />
  );
};

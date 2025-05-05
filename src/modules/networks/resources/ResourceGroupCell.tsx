import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourceGroupCell = ({ resource }: Props) => {
  const { permission } = usePermissions();

  const { network, openResourceGroupModal } = useNetworksContext();

  return (
    <button
      className={"flex cursor-pointer"}
      onClick={() => {
        if (!network || !permission.networks.update) return;
        openResourceGroupModal(network, resource);
      }}
    >
      <MultipleGroups groups={resource?.groups as Group[]} />
    </button>
  );
};

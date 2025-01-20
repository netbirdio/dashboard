import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourceGroupCell = ({ resource }: Props) => {
  const { network, openResourceGroupModal } = useNetworksContext();

  return (
    <button
      className={"flex cursor-pointer"}
      onClick={() => {
        if (!network) return;
        openResourceGroupModal(network, resource);
      }}
    >
      <MultipleGroups groups={resource?.groups as Group[]} />
    </button>
  );
};

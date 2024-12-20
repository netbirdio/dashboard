import Button from "@components/Button";
import { SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
};
export const ResourceActionCell = ({ resource }: Props) => {
  const { deleteResource, network, openResourceModal } = useNetworksContext();

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => {
          if (!network) return;
          openResourceModal(network, resource);
        }}
      >
        <SquarePenIcon size={16} />
        Edit
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={() => {
          if (!network) return;
          deleteResource(network, resource);
        }}
      >
        <Trash2 size={16} />
        Remove
      </Button>
    </div>
  );
};

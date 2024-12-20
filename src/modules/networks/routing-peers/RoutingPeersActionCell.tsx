import Button from "@components/Button";
import { SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  router: NetworkRouter;
};
export const RoutingPeersActionCell = ({ router }: Props) => {
  const { deleteRouter, network, openAddRoutingPeerModal } =
    useNetworksContext();

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => {
          if (!network) return;
          openAddRoutingPeerModal(network, router);
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
          deleteRouter(network, router);
        }}
      >
        <Trash2 size={16} />
        Remove
      </Button>
    </div>
  );
};

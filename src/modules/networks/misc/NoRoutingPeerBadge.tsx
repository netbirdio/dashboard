import Badge from "@components/Badge";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { NoRoutingPeerLabel } from "@/modules/networks/misc/NoRoutingPeerLabel";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};

/** Warns that the network cannot route yet, and opens the add routing peer modal for it. */
export const NoRoutingPeerBadge = ({ network }: Props) => {
  const { permission } = usePermissions();
  const { openAddRoutingPeerModal } = useNetworksContext();

  return (
    // A real button, so the modal takes focus from a clicked control;
    // after a click on a plain element the browser draws a focus ring
    // on whatever the modal focuses first.
    <button
      type={"button"}
      className={"rounded-md"}
      disabled={!permission.networks.update}
      onClick={() => openAddRoutingPeerModal(network)}
    >
      <Badge
        variant={"gray"}
        className={"min-h-[34px] font-medium"}
        useHover={permission.networks.update}
      >
        <NoRoutingPeerLabel />
      </Badge>
    </button>
  );
};

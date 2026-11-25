import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { AlertTriangleIcon } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};

/** Warns that the network cannot route yet, and opens the add routing peer modal for it. */
export const NoRoutingPeerBadge = ({ network }: Props) => {
  const { permission } = usePermissions();
  const { openAddRoutingPeerModal } = useNetworksContext();

  return (
    <FullTooltip
      interactive={false}
      content={
        <div className={"max-w-xs text-xs"}>
          <div>Resources not reachable without a routing peer.</div>
          {permission.networks.update && (
            <div className={"mt-1"}>
              Add one or multiple peers as routing peers.
            </div>
          )}
        </div>
      }
    >
      {/* A real button, so the modal takes focus from a clicked control;
          after a click on a plain element the browser draws a focus ring
          on whatever the modal focuses first. */}
      <button
        type={"button"}
        className={"rounded-md"}
        aria-label={"No routing peer"}
        disabled={!permission.networks.update}
        onClick={() => openAddRoutingPeerModal(network)}
      >
        <Badge
          variant={"yellow"}
          className={"min-h-[34px] px-2.5"}
          useHover={permission.networks.update}
        >
          <AlertTriangleIcon size={14} className={"shrink-0"} />
        </Badge>
      </button>
    </FullTooltip>
  );
};

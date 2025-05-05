import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { IconCirclePlus } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import * as React from "react";
import { Suspense } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import NetworkRoutingPeersTable from "@/modules/networks/routing-peers/NetworkRoutingPeersTable";

export const NetworkRoutingPeersSection = ({
  network,
}: {
  network: Network;
}) => {
  const { permission } = usePermissions();
  const { data: routers, isLoading } = useFetchApi<NetworkRouter[]>(
    `/networks/${network.id}/routers`,
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const { openAddRoutingPeerModal } = useNetworksContext();

  return (
    <div className={"py-7 px-8"} id={"routing-peers"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center"}>
          <div>
            <h2 ref={headingRef}>Routing Peers</h2>
            <Paragraph>
              Add and manage routing peers for this network.
            </Paragraph>
          </div>
          <div className={"inline-flex gap-4 justify-end"}>
            <div>
              <Button
                variant={"primary"}
                onClick={() => openAddRoutingPeerModal(network)}
                disabled={!permission.networks.update}
              >
                <IconCirclePlus size={16} />
                Add Routing Peer
              </Button>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div>
              <SkeletonTableHeader className={"!p-0"} />
              <div className={"mt-8 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <NetworkRoutingPeersTable
            isLoading={isLoading}
            routers={routers}
            headingTarget={portalTarget}
          />
        </Suspense>
      </div>
    </div>
  );
};

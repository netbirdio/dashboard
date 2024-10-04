import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import * as React from "react";
import { lazy, Suspense } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import type { Peer } from "@/interfaces/Peer";
import { AddExitNodeButton } from "@/modules/exit-node/AddExitNodeButton";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";
import AddRouteDropdownButton from "@/modules/peer/AddRouteDropdownButton";
import usePeerRoutes from "@/modules/peer/usePeerRoutes";

const PeerRoutesTable = lazy(() => import("@/modules/peer/PeerRoutesTable"));

type Props = {
  peer: Peer;
};

export const PeerNetworkRoutesSection = ({ peer }: Props) => {
  const { peerRoutes, isLoading } = usePeerRoutes({ peer });
  const hasExitNodes = useHasExitNodes(peer);
  const { isUser } = useLoggedInUser();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <div className={"pt-7 pb-10 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <h2 ref={headingRef}>Network Routes</h2>
            <Paragraph>
              Access other networks without installing NetBird on every
              resource.
            </Paragraph>
          </div>
          <div className={"inline-flex gap-4 justify-end"}>
            <div className={"gap-4 flex"}>
              <AddExitNodeButton peer={peer} firstTime={!hasExitNodes} />
              <AddRouteDropdownButton />
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div>
              <div className={"mt-0 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <PeerRoutesTable
            peer={peer}
            isLoading={isLoading}
            peerRoutes={peerRoutes}
            headingTarget={portalTarget}
          />
        </Suspense>
      </div>
    </div>
  );
};

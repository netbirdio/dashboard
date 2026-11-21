import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import * as React from "react";
import { lazy, Suspense, useMemo } from "react";
import type { Peer } from "@/interfaces/Peer";
import { isLegacyExitNodeRoute } from "@/modules/exit-nodes/exitNodeHelpers";
import AddRouteDropdownButton from "@/modules/peer/AddRouteDropdownButton";
import usePeerRoutes from "@/modules/peer/usePeerRoutes";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";

const PeerRoutesTable = lazy(() => import("@/modules/peer/PeerRoutesTable"));

type Props = {
  peer: Peer;
};

export const PeerNetworkRoutesSection = ({ peer }: Props) => {
  const { peerRoutes: allRoutes, isLoading } = usePeerRoutes({ peer });
  // Exit node routes are listed in the Exit Node tab.
  const peerRoutes = useMemo(
    () => allRoutes?.filter((route) => !isLegacyExitNodeRoute(route)),
    [allRoutes],
  );

  return (
    <div className={"pb-10 px-8"}>
      <div className={""}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <Paragraph>
              Access other networks without installing NetBird on every
              resource.{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                }
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"inline-flex gap-4 justify-end"}>
            <div className={"gap-4 flex"}>
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
          />
        </Suspense>
      </div>
    </div>
  );
};

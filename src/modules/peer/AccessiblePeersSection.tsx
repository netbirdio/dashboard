import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import * as React from "react";
import { lazy, Suspense } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import type { Peer } from "@/interfaces/Peer";

const AccessiblePeersTable = lazy(
  () => import("@/modules/peer/AccessiblePeersTable"),
);

type Props = {
  peerID: string;
};
export const AccessiblePeersSection = ({ peerID }: Props) => {
  const { data: peers, isLoading } = useFetchApi<Peer[]>(
    `/peers/${peerID}/accessible-peers`,
  );
  const { users } = useUsers();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const peersWithUser = peers?.map((peer) => {
    if (!users) return peer;
    return {
      ...peer,
      user: users?.find((user) => user.id === peer.user_id),
    };
  });

  return (
    <div className={"pb-10 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <h2 ref={headingRef}>Accessible Peers</h2>
            <Paragraph>
              This peer can connect to the following peers within the NetBird
              network.
            </Paragraph>
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
          <AccessiblePeersTable
            peerID={peerID}
            isLoading={isLoading}
            peers={peersWithUser}
            headingTarget={portalTarget}
          />
        </Suspense>
      </div>
    </div>
  );
};

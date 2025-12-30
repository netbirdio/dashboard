import * as React from "react";
import { Suspense, useMemo } from "react";
import { usePortalElement } from "@hooks/usePortalElement";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { User } from "@/interfaces/User";
import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import MinimalPeersTable from "@/modules/peer/MinimalPeersTable";
import NoResults from "@components/ui/NoResults";
import PeerIcon from "@/assets/icons/PeerIcon";
import Paragraph from "@components/Paragraph";

type Props = {
  user: User;
};

export const UserPeersSection = ({ user }: Props) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");

  const userPeers = useMemo(() => {
    return (
      peers?.filter((peer) => {
        return peer?.user_id === user.id;
      }) || []
    );
  }, [user, peers]);

  return (
    <div className={"pb-10 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <h2 ref={headingRef}>Peers</h2>
            <Paragraph>View all peers registered by this user.</Paragraph>
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
          <MinimalPeersTable
            isLoading={isPeersLoading}
            peers={userPeers}
            headingTarget={portalTarget}
            getStartedCard={
              <NoResults
                className={"py-4"}
                title={"This user has no registered peers"}
                description={
                  "Install NetBird and sign in as this user to register peers."
                }
                icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
              />
            }
          />
        </Suspense>
      </div>
    </div>
  );
};

import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import * as React from "react";
import { Suspense, useMemo } from "react";
import { NetworkRouter } from "@/interfaces/Network";
import NetworkRoutingPeersTable from "@/modules/networks/routing-peers/NetworkRoutingPeersTable";
import useFetchApi from "@utils/api";
import { useGroups } from "@/contexts/GroupsProvider";
import { Peer } from "@/interfaces/Peer";
import { useUsers } from "@/contexts/UsersProvider";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";

export const NetworkRoutingPeersTabContent = ({
  routers,
  isLoading,
}: {
  routers?: NetworkRouter[];
  isLoading: boolean;
}) => {
  const { groups } = useGroups();
  const { users } = useUsers();
  const { data: peers } = useFetchApi<Peer[]>(`/peers`);

  const data = useMemo(() => {
    return routers?.map((router) => {
      const peer = peers?.find((peer) => peer.id === router.peer);
      const user = users?.find((user) => user.id === router.peer);
      const group = groups?.find(
        (group) => group.id === router?.peer_groups?.[0],
      );

      return {
        ...router,
        search: `${peer?.name} ${peer?.ip} ${user?.name} ${user?.id} ${group?.name}`,
      };
    });
  }, [users, peers, routers, groups]);

  return (
    <div className={"px-8"} id={"routing-peers"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            Add routing peers to this network to access resources inside this
            network.
          </Paragraph>
          <Paragraph>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/manage/networks#routing-peers"}
              target={"_blank"}
            >
              Routing Peers
              <ExternalLinkIcon size={12} />
            </InlineLink>
            in our documentation.
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
        <NetworkRoutingPeersTable isLoading={isLoading} routers={data} />
      </Suspense>
    </div>
  );
};

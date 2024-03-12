"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense, useEffect } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function Peers() {
  const { data: peers, isLoading } = useFetchApi<Peer[]>("/peers");
  const { users } = useUsers();
  const { refresh } = useGroups();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const peersWithUser = peers?.map((peer) => {
    if (!users) return peer;
    return {
      ...peer,
      user: users?.find((user) => user.id === peer.user_id),
    };
  });

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
        </Breadcrumbs>
        <h1>{peers && peers.length > 1 ? `${peers.length} Peers` : "Peers"}</h1>
        <Paragraph>
          A list of all machines and devices connected to your private network.
          Use this view to manage peers.
        </Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/add-machines-to-your-network"}
            target={"_blank"}
          >
            Peers
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <PeersTable isLoading={isLoading} peers={peersWithUser} />
      </Suspense>
    </PageContainer>
  );
}

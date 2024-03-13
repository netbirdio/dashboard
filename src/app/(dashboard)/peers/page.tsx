"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function Peers() {
  const { isUser } = useLoggedInUser();

  return (
    <PageContainer>
      {isUser ? <PeersDefaultView /> : <PeersView />}
    </PageContainer>
  );
}

function PeersView() {
  const { data: peers, isLoading } = useFetchApi<Peer[]>("/peers");
  const { users } = useUsers();

  const peersWithUser = peers?.map((peer) => {
    if (!users) return peer;
    return {
      ...peer,
      user: users?.find((user) => user.id === peer.user_id),
    };
  });

  return (
    <>
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
    </>
  );
}

function PeersDefaultView() {
  return (
    <>
      <div className={"p-default py-6"}>
        <h1>Add new peer to your network</h1>
        <Paragraph>
          To get started, install NetBird and log in using your email account.
          After that you should be connected.
        </Paragraph>
        <Paragraph>
          If you have further questions check out our{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started#installation"}
            target={"_blank"}
          >
            Installation Guide
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <div className={"grid w-full px-8 pt-1"}>
        <div className={"max-w-3xl"}>
          <div
            className={
              "rounded-md border border-nb-gray-900/70 grid w-full bg-nb-gray-930/40 stepper-bg-variant"
            }
          >
            <SetupModalContent
              header={false}
              footer={false}
              tabAlignment={"start"}
            />
          </div>
        </div>
      </div>
    </>
  );
}

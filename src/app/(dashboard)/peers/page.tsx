"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function Peers() {
  const { isRestricted } = usePermissions();

  return (
    <PageContainer>
      {isRestricted ? (
        <PeersBlockedView />
      ) : (
        <PeersProvider>
          <PeersView />
        </PeersProvider>
      )}
    </PageContainer>
  );
}

function PeersView() {
  const { peers, isLoading } = usePeers();
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
    <>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Peers</h1>
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
        <PeersTable
          isLoading={isLoading}
          peers={peersWithUser}
          headingTarget={portalTarget}
        />
      </Suspense>
    </>
  );
}

function PeersBlockedView() {
  return (
    <div className={"flex items-center justify-center flex-col"}>
      <div className={"p-default py-6 max-w-3xl text-center"}>
        <h1>Add new device to your network</h1>
        <Paragraph className={"inline"}>
          To get started, install NetBird and log in using your email account.
          After that you should be connected. If you have further questions
          check out our{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started#installation"}
            target={"_blank"}
          >
            Installation Guide
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <div className={"px-3 pt-1 pb-8 max-w-3xl w-full"}>
        <div
          className={
            "rounded-md border border-nb-gray-900/70 grid w-full bg-nb-gray-930/40"
          }
        >
          <SetupModalContent header={false} footer={false} />
        </div>
      </div>
    </div>
  );
}

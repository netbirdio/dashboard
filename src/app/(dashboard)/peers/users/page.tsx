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

export default function UserDevicesPage() {
  const { isRestricted } = usePermissions();

  return (
    <PageContainer>
      {isRestricted ? (
        <UserDevicesBlockedView />
      ) : (
        <PeersProvider>
          <UserDevicesView />
        </PeersProvider>
      )}
    </PageContainer>
  );
}

function UserDevicesView() {
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
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/peers/users"}
            label={"User Devices"}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>User Devices</h1>
        <Paragraph>
          Laptops, phones and other personal devices with a user behind them,
          typically added when the user signs in with SSO.{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/add-machines-to-your-network"}
            target={"_blank"}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <PeersTable
          isLoading={isLoading}
          peers={peersWithUser}
          headingTarget={portalTarget}
          kind={"users"}
        />
      </Suspense>
    </>
  );
}

function UserDevicesBlockedView() {
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
            "rounded-md border border-nb-gray-900/70 grid w-full bg-nb-gray-930/40 stepper-bg-variant"
          }
        >
          <SetupModalContent header={false} footer={false} isUserDevice />
        </div>
      </div>
    </div>
  );
}

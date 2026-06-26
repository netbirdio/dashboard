"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { lazy, Suspense, useMemo } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import useDistributorRedirect from "@/cloud/distributor/useDistributorRedirect";
import { useBypassedPeers } from "@/cloud/edr/useBypass";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import type { PeersTableKind } from "@/modules/peers/PeersTable";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function PeersPage() {
  const { isRestricted } = usePermissions();
  const { isLoading: isDistributorRedirecting } = useDistributorRedirect();
  if (isDistributorRedirecting) return <FullScreenLoading />;

  return (
    <PageContainer>
      {isRestricted ? (
        <PeersBlockedView />
      ) : (
        // Suspense boundary required because PeersView reads useSearchParams,
        // which the static export build otherwise rejects.
        <Suspense fallback={<FullScreenLoading />}>
          <PeersProvider>
            <PeersView />
          </PeersProvider>
        </Suspense>
      )}
    </PageContainer>
  );
}

function PeersView() {
  const searchParams = useSearchParams();
  // Honour ?kind= so the redirects from the old /peers/users and
  // /peers/servers routes open the table on the matching subset. With no
  // param the switch starts unselected and the table shows all peers.
  const kindParam = searchParams?.get("kind");
  const defaultKind: PeersTableKind | undefined =
    kindParam === "servers"
      ? "servers"
      : kindParam === "users"
        ? "users"
        : undefined;

  const { peers, isLoading: isPeersLoading } = usePeers();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { isBypassed } = useBypassedPeers();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  // The kind filter classifies peers by whether their owner is a real user vs
  // a service/no-user, so we must wait until both peers and users have loaded
  // before joining them — otherwise peers temporarily render with
  // peer.user === undefined and get misclassified.
  const isLoading = isPeersLoading || isUsersLoading;
  const peersWithUser = useMemo(() => {
    if (!peers || !users) return undefined;
    return peers.map((peer) => ({
      ...peer,
      user: users.find((u) => u.id === peer.user_id),
      force_approved: peer.id ? isBypassed(peer.id) : false,
    }));
  }, [peers, users, isBypassed]);

  return (
    <>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Peers</h1>
        <Paragraph>
            User devices and headless machines, such as servers and autonomous agents, connected to your network.{" "}
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
          defaultKind={defaultKind}
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
            "rounded-md border border-nb-gray-900/70 grid w-full bg-nb-gray-930/40 stepper-bg-variant"
          }
        >
          <SetupModalContent header={false} footer={false} isUserDevice />
        </div>
      </div>
    </div>
  );
}

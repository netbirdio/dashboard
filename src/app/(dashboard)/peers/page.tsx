"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import React, { lazy, Suspense, useMemo } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import PageContainer from "@/layouts/PageContainer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

const PeersTable = lazy(() => import("@/modules/peers/PeersTable"));

export default function PeersPage() {
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
  const { peers, isLoading: isPeersLoading } = usePeers();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const isLoading = isPeersLoading || isUsersLoading;
  const peersWithUser = useMemo(() => {
    if (!peers || !users) return undefined;
    return peers.map((peer) => ({
      ...peer,
      user: users.find((u) => u.id === peer.user_id),
    }));
  }, [peers, users]);

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
        <h1 ref={headingRef}>
          Peers
          <FullTooltip
            side={"right"}
            align={"center"}
            className={"ml-2 align-middle"}
            content={
              <div className={"max-w-md space-y-3 text-xs leading-relaxed"}>
                <div>
                  <div className={"font-medium text-nb-gray-100"}>Servers</div>
                  <div>
                    Servers, VMs, autonomous agents and other unattended
                    machines with no user behind them, typically enrolled with a
                    setup key.
                  </div>
                </div>
                <div>
                  <div className={"font-medium text-nb-gray-100"}>Devices</div>
                  <div>
                    Laptops, phones and other personal devices with a user
                    behind them, typically added when the user signs in with
                    SSO.
                  </div>
                </div>
              </div>
            }
          >
            <span
              className={
                "inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-nb-gray-500 transition-colors hover:text-nb-gray-200"
              }
            >
              <InfoIcon size={14} />
            </span>
          </FullTooltip>
        </h1>
        <Paragraph>
          A list of all machines and devices connected to your private network.{" "}
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
          showKindFilters
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
          <SetupModalContent header={false} footer={false} />
        </div>
      </div>
    </div>
  );
}

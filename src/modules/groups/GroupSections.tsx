import { usePortalElement } from '@/hooks/usePortalElement'
import { Peer } from '@/interfaces/Peer'
import React, { Suspense, lazy } from 'react'
import { User } from '@/interfaces/User'
import { Policy } from '@/interfaces/Policy'
import PoliciesProvider from '@/contexts/PoliciesProvider'
import { NetworkResource } from '@/interfaces/Network'
import { Route } from "@/interfaces/Route";
import { NameserverGroup } from '@/interfaces/Nameserver'
import { SetupKey } from '@/interfaces/SetupKey'
import Paragraph from '@/components/Paragraph'
import SkeletonTable, { SkeletonTableHeader } from '@/components/skeletons/SkeletonTable'

const AccessiblePeersTable = lazy(
  () => import("@/modules/peer/AccessiblePeersTable"),
);
const UsersTable = lazy(
  () => import("@/modules/users/UsersTable"),
);
const ResourcesTable = lazy(
  () => import("@/modules/networks/resources/ResourcesTable"),
);
const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);
const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);
const NameserverGroupTable = lazy(
  () => import("@/modules/dns-nameservers/table/NameserverGroupTable"),
);

const PeerRoutesTable = lazy(
  () => import("@/modules/peer/PeerRoutesTable"),
);

export const GroupPeersSection = ({ peers, users }: { peers: Peer[], users: User[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const peersWithUser = peers?.map((peer) => {
    if (!users) return peer;
    return {
      ...peer,
      user: users?.find((user) => user.id === peer.user_id),
    };
  });
  return (<GroupContainer
    headingRef={headingRef}
    title='Peers in this Group'
    description='List of all peers that are members of this group'
  >
    <AccessiblePeersTable
      isLoading={false}
      peers={peersWithUser}
      headingTarget={portalTarget}
      inGroup={true}
    />
  </GroupContainer>
  )
}

export const GroupUsersSection = ({ users }: { users: User[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Users in this Group'
    description='Users who have access to this group'
  >
    <UsersTable
      isLoading={false}
      users={users}
      headingTarget={portalTarget}
      inGroup={true}
    />
  </GroupContainer>
  )
}
export const GroupPoliciesSection = ({ policies }: { policies: Policy[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Users in this Group'
    description='Users who have access to this group'
  >
    <PoliciesProvider>
      <AccessControlTable
        isLoading={false}
        policies={policies}
        headingTarget={portalTarget}
        inGroup={true}
      />
    </PoliciesProvider>
  </GroupContainer>
  )
}

export const GroupResourcesSection = ({ resources }: { resources: NetworkResource[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Resources in this Group'
    description='List of all resources that are accessible through this group'
  >
    <ResourcesTable
      isLoading={false}
      resources={resources}
      headingTarget={portalTarget}
      inGroup={true}
    />
  </GroupContainer>
  )
}


export const GroupNameserversSection = ({ nameserverGroups }: { nameserverGroups: NameserverGroup[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Nameservers in this Group'
    description='DNS nameserver configurations for this group'
  >
    <NameserverGroupTable
      isLoading={false}
      nameserverGroups={nameserverGroups}
      headingTarget={portalTarget}
      inGroup={true}
    />
  </GroupContainer>
  )
}

export const GroupNetworkRoutesSection = ({ peerRoutes }: { peerRoutes: Route[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Network Routes'
    description='Network routing configurations for this group'
  >
    <PeerRoutesTable
      isLoading={false}
      peerRoutes={peerRoutes}
      headingTarget={portalTarget}
      inGroup={true}
    />
  </GroupContainer>
  )
}

export const GroupSetupKeysSection = ({ setupKeys }: { setupKeys: SetupKey[] }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (<GroupContainer
    headingRef={headingRef}
    title='Resources in this Group'
    description='List of all resources that are accessible through this group'
  >
    <SetupKeysTable
      isLoading={false}
      headingTarget={portalTarget}
      setupKeys={setupKeys}
      inGroup={true}
    />
  </GroupContainer>
  )
}


type Props = {
  title: string,
  description: string,
  headingRef: React.RefObject<HTMLHeadingElement>,
  children: React.ReactNode
}

const GroupContainer = ({ title, description, headingRef, children }: Props) => {
  return (
    <div className={"pb-10 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <h2 ref={headingRef}>{title}</h2>
            <Paragraph>
              {description}
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

          {children}
        </Suspense>
      </div>
    </div>
  )
}

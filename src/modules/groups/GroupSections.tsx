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
import { AddItemsToGroup } from './AddItemsToGroupModal'
import { GroupDetails } from './useGroupDetails'
import { PeersTableColumns } from './AssignPeerToGroupModal'
import useFetchApi, { useApiCall } from '@/utils/api'
import { MonitorSmartphoneIcon } from 'lucide-react'
import { notify } from '@/components/Notification'
import { useSWRConfig } from 'swr'
import { Group } from '@/interfaces/Group'
import { RemoveItemsFromGroup } from './RemoveItemsFromGroup'

const PeersTable = lazy(
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

export const GroupPeersSection = ({ group }: { group: GroupDetails }) => {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const { mutate } = useSWRConfig();
  const groupRequest = useApiCall<Group>("/groups");



  const handleAddPeers = async (selectedPeers: Peer[]) => {
    const currentPeerIds = group.peers?.map(p => typeof p === 'string' ? p : p.id) || [];
    const newPeerIds = [...currentPeerIds, ...selectedPeers.map(peer => peer.id)];
    notify({
      title: "Adding peers to group",
      description: `Peers were successfully added to ${group.name}.`,
      promise: groupRequest.put({ name: group.name, peers: newPeerIds }, "/" + group.id)
        .then(() => {
          mutate("/groups/" + group.id);
        }),
      loadingMessage: "Adding peers to group...",
    });
  };

  const handleRemovePeer = (peer: Peer) => {
    const currentPeerIds = group.peers?.map(p => typeof p === 'string' ? p : p.id) || [];
    const newPeerIds = currentPeerIds.filter(pid => pid != peer.id!)
    notify({
      title: `Removing peer from ${group.name} group`,
      description: `Peer were successfully removed to ${group.name}.`,
      promise: groupRequest.put({ name: group.name, peers: newPeerIds }, "/" + group.id)
        .then(() => {
          mutate("/groups/" + group.id);
        }),
      loadingMessage: "Adding peers to group...",
    });
  }

  return (<GroupContainer
    headingRef={headingRef}
    title='Peers in this Group'
    description='List of all peers that are members of this group'
  >
    <PeersTable
      isLoading={false}
      peers={group.peersGroup}
      headingTarget={portalTarget}
      inGroup={true}
      removeFromGroupCell={(peer) => (<RemoveItemsFromGroup<Peer>
        groupName={group.name}
        item={peer}
        itemName='Peer'
        handleRemoveItem={handleRemovePeer}
      />)}
      rightSide={() => (<AddItemsToGroup<Peer>
        groupName={group.name} items={group.peersGroup}
        itemName='Peers'
        itemTableColumns={PeersTableColumns}
        fetchAllItems={() => useFetchApi<Peer[]>("/peers")}
        handleAddItem={handleAddPeers}
        itemIcon={<MonitorSmartphoneIcon size={20} />}
      />)}
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

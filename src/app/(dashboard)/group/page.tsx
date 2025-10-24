"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import FullTooltip from "@components/FullTooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useRedirect from "@hooks/useRedirect";
import useFetchApi from "@utils/api";
import { cn, singularize } from "@utils/helpers";
import { FolderGit2Icon, Layers3Icon, PencilIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { GroupProvider, useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { Group, GROUP_TOOLTIP_TEXT } from "@/interfaces/Group";
import PageContainer from "@/layouts/PageContainer";
import { GroupNameserversSection } from "@/modules/groups/details/GroupNameserversSection";
import { GroupNetworkRoutesSection } from "@/modules/groups/details/GroupNetworkRoutesSection";
import { GroupPeersSection } from "@/modules/groups/details/GroupPeersSection";
import { GroupPoliciesSection } from "@/modules/groups/details/GroupPoliciesSection";
import { GroupResourcesSection } from "@/modules/groups/details/GroupResourcesSection";
import { GroupSetupKeysSection } from "@/modules/groups/details/GroupSetupKeysSection";
import { GroupUsersSection } from "@/modules/groups/details/GroupUsersSection";
import useGroupDetails from "@/modules/groups/details/useGroupDetails";

export default function GroupPage() {
  const queryParameter = useSearchParams();
  const { isRestricted } = usePermissions();
  const groupId = queryParameter.get("id");
  const {
    data: group,
    isLoading,
    error,
  } = useFetchApi<Group>(`/groups/${groupId}`, true);

  useRedirect("/team/groups", false, !groupId || isRestricted);

  if (isRestricted) {
    return (
      <PageContainer>
        <RestrictedAccess page={"Group Information"} />
      </PageContainer>
    );
  }

  if (error)
    return (
      <PageNotFound
        title={error?.message}
        description={
          "The group you are attempting to access cannot be found. It may have been deleted, or you may not have permission to view it. Please verify the URL or return to the dashboard."
        }
      />
    );

  return group && !isLoading ? (
    <PageContainer>
      <RoutesProvider>
        <GroupProvider group={group} isDetailPage={true}>
          <div className={"p-default py-6 pb-0 w-full"}>
            <Breadcrumbs>
              <Breadcrumbs.Item
                href={"/team"}
                label={"Team"}
                icon={<TeamIcon size={13} />}
              />
              <Breadcrumbs.Item
                href={"/team/groups"}
                label={"Groups"}
                icon={<FolderGit2Icon size={14} />}
              />
              <Breadcrumbs.Item label={group.name} active />
            </Breadcrumbs>
            <GroupDetailsName />
          </div>
          <GroupOverviewTabs group={group} />
        </GroupProvider>
      </RoutesProvider>
    </PageContainer>
  ) : (
    <FullScreenLoading />
  );
}

const GroupDetailsName = () => {
  const { group, isJWTGroup, isAllowedToRename, openGroupRenameModal } =
    useGroupContext();

  return (
    <div className={"w-full"}>
      <h1 className={"flex items-center gap-3 w-full whitespace-nowrap"}>
        <GroupBadgeIcon
          id={group?.id}
          issued={group?.issued}
          variant={"large"}
        />
        {group.name}
        <div>
          <FullTooltip
            content={
              <div className={"text-xs max-w-xs"}>
                {isJWTGroup
                  ? GROUP_TOOLTIP_TEXT.RENAME.JWT
                  : GROUP_TOOLTIP_TEXT.RENAME.INTEGRATION}
              </div>
            }
            interactive={false}
            disabled={isAllowedToRename}
            className={"w-full block"}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 rounded-md cursor-pointer",
                !isAllowedToRename &&
                  "opacity-40 cursor-not-allowed pointer-events-none",
              )}
              onClick={openGroupRenameModal}
            >
              <PencilIcon size={16} />
            </div>
          </FullTooltip>
        </div>
      </h1>
    </div>
  );
};

const GroupOverviewTabs = ({ group }: { group: Group }) => {
  const [tab, setTab] = useState("users");
  const groupDetails = useGroupDetails(group?.id || "");

  const peersCount = groupDetails?.peers_count || 0;
  const usersCount = groupDetails?.users?.length || 0;
  const policiesCount = groupDetails?.policies?.all.length || 0;
  const resourcesCount = groupDetails?.resources_count || 0;
  const routesCount = groupDetails?.routes?.length || 0;
  const nameserversCount = groupDetails?.nameservers?.length || 0;
  const setupKeysCount = groupDetails?.setupKeys?.length || 0;

  return (
    <Tabs
      defaultValue={tab}
      onValueChange={(v) => setTab(v)}
      value={tab}
      className={"pt-4 pb-0 mb-0"}
    >
      <TabsList justify={"start"} className={"px-8"}>
        <TabsTrigger value={"users"}>
          <TeamIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Users", usersCount)}
        </TabsTrigger>

        <TabsTrigger value={"peers"}>
          <PeerIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Peers", peersCount)}
        </TabsTrigger>

        <TabsTrigger value={"policies"}>
          <AccessControlIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Policies", policiesCount)}
        </TabsTrigger>

        <TabsTrigger value={"resources"}>
          <Layers3Icon size={14} />
          {singularize("Resources", resourcesCount)}
        </TabsTrigger>

        <TabsTrigger value={"network-routes"}>
          <NetworkRoutesIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Network Routes", routesCount)}
        </TabsTrigger>

        <TabsTrigger value={"nameservers"}>
          <DNSIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Nameservers", nameserversCount)}
        </TabsTrigger>

        <TabsTrigger value={"setup-keys"}>
          <SetupKeysIcon
            size={12}
            className={
              "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
            }
          />
          {singularize("Setup Keys", setupKeysCount)}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={"users"} className={"pb-8"}>
        <GroupUsersSection users={groupDetails?.users} />
      </TabsContent>

      <TabsContent value={"peers"} className={"pb-8"}>
        <GroupPeersSection peers={groupDetails?.peersOfGroup} />
      </TabsContent>

      <TabsContent value={"policies"} className={"pb-8"}>
        <GroupPoliciesSection policies={groupDetails?.policies} />
      </TabsContent>

      <TabsContent value={"resources"} className={"pb-8"}>
        <GroupResourcesSection resources={groupDetails?.networkResources} />
      </TabsContent>

      <TabsContent value={"network-routes"} className={"pb-8"}>
        <GroupNetworkRoutesSection routes={groupDetails?.routes} />
      </TabsContent>

      <TabsContent value={"nameservers"} className={"pb-8"}>
        <GroupNameserversSection nameserverGroups={groupDetails?.nameservers} />
      </TabsContent>

      <TabsContent value={"setup-keys"} className={"pb-8"}>
        <GroupSetupKeysSection setupKeys={groupDetails?.setupKeys} />
      </TabsContent>
    </Tabs>
  );
};

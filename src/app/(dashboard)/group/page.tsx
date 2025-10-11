"use client";
import { notify } from "@components/Notification";
import Breadcrumbs from "@components/Breadcrumbs";
import Card from "@components/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import useRedirect from "@hooks/useRedirect";
import { useApiCall } from "@utils/api";
import {
  FolderGit2Icon,
  GlobeIcon,
  KeyIcon,
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  PencilIcon,
  RouteIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import PageContainer from "@/layouts/PageContainer";
import { SetupKey } from "@/interfaces/SetupKey";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";
import useGroupDetails, { GroupDetails } from "@/modules/groups/useGroupDetails";
import TeamIcon from "@/assets/icons/TeamIcon";
import { GroupNameserversSection, GroupNetworkRoutesSection, GroupPeersSection, GroupPoliciesSection, GroupResourcesSection, GroupSetupKeysSection, GroupUsersSection } from "@/modules/groups/GroupSections";

export default function GroupPage() {
  const queryParameter = useSearchParams();
  const { isRestricted } = usePermissions();
  const groupId = queryParameter.get("id");

  useRedirect("/team/groups", false, !groupId || isRestricted);

  if (isRestricted || !groupId) {
    return (
      <PageContainer>
        <RestrictedAccess page={"Group Information"} />
      </PageContainer>
    );
  }

  const group = useGroupDetails(groupId)

  return group ? (
    <GroupOverview group={group} />
  ) : (
    <FullScreenLoading />
  );
}

function GroupOverview({ group }: { group: GroupDetails }) {
  return (
    <PageContainer>
      <RoutesProvider>
        <div className={"p-default py-6 pb-0"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/team"}
              label={"Team"}
              icon={<TeamIcon size={13} />}
            />
            <Breadcrumbs.Item
              href={"/team/groups"}
              label={"Groups"}
              icon={<FolderGit2Icon size={13} />}
            />
            <Breadcrumbs.Item label={group.name} active />
          </Breadcrumbs>
          <GroupGeneralInformation group={group} />
        </div>
        <GroupOverviewTabs group={group} />
      </RoutesProvider>
    </PageContainer>
  );
}


const GroupGeneralInformation = ({ group }: { group: GroupDetails }) => {
  const { mutate } = useSWRConfig();
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const groupRequest = useApiCall<SetupKey>("/groups/" + group.id);
  const { permission } = usePermissions();
  const { isRegularGroup, isJWTGroup } = useGroupIdentification({
    id: group?.id,
    issued: group?.issued,
  });
  const updatePermission = useMemo(() => {
    //todo : @Eduard can you check the logic here for group rename
    let rename = true;

    // Rename logic
    if (permission.groups.update) rename = false;
    if (isJWTGroup) rename = true; // maybe JWT groups can't be renamed?
    if (!isRegularGroup) rename = true;

    return { rename };
  }, [permission, isJWTGroup, isRegularGroup]);

  const onGroupNameUpdate = (name: string) => {
    notify({
      title: "Group: " + group.name,
      description: "Group was successfully Rename.",
      promise: groupRequest.put({ name: name }).then(() => {
        mutate("/groups/" + group.id);
      }),
      loadingMessage: "Renaming the group...",
    });
    setShowEditNameModal(false);
  };

  return (
    <>
      {showEditNameModal && (
        <EditGroupNameModal
          initialName={group.name}
          open={showEditNameModal}
          onOpenChange={setShowEditNameModal}
          onSuccess={onGroupNameUpdate}
        />
      )}
      <div className={"flex justify-between max-w-6xl items-start"}>
        <div>
          <div className={"flex items-center gap-3"}>
            <h1 className={"flex items-center gap-3"}>
              <FolderGit2Icon size={20} className={"mb-[3px] shrink-0"} />
              <TextWithTooltip text={group.name} maxChars={30} />
              {updatePermission && (
                <div
                  className={
                    "flex h-8 w-8 items-center justify-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 rounded-md cursor-pointer"
                  }
                  onClick={() => setShowEditNameModal(true)}
                >
                  <PencilIcon size={16} />
                </div>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div
        className={
          "flex-wrap xl:flex-nowrap flex gap-10 w-full mt-5 max-w-6xl items-start"
        }
      >
        <GroupInformationCard group={group} />
      </div>
    </>
  );
};

function GroupInformationCard({ group }: { group: GroupDetails }) {
  return (
    <Card className={"w-full xl:w-1/2"}>
      <Card.List>
        <Card.ListItem
          copy
          copyText={group.id}
          label={
            <>
              <KeyIcon size={16} />
              Group ID
            </>
          }
          value={group.id}
        />

        <Card.ListItem
          label={
            <>
              <UsersIcon size={16} />
              Group Name
            </>
          }
          value={group.name}
        />

        <Card.ListItem
          label={
            <>
              <UserCheckIcon size={16} />
              Total Peers
            </>
          }
          value={group.peers_count?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <ServerIcon size={16} />
              Total Resources
            </>
          }
          value={group.resources_count?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <UserIcon size={16} />
              Users
            </>
          }
          value={group.users?.length?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <ShieldCheckIcon size={16} />
              Policies
            </>
          }
          value={group.policies?.length?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <RouteIcon size={16} />
              Network Routes
            </>
          }
          value={group.routes?.length?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <GlobeIcon size={16} />
              Nameservers
            </>
          }
          value={group.nameservers?.length?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <KeyRoundIcon size={16} />
              Setup Keys
            </>
          }
          value={group.setupKeys?.length?.toString() ?? "0"}
        />

        <Card.ListItem
          label={
            <>
              <KeyRoundIcon size={16} />
              Issued By
            </>
          }
          value={group.issued}
        />
      </Card.List>
    </Card>
  );
}
const GroupOverviewTabs = ({ group }: { group: GroupDetails }) => {
  const [tab, setTab] = useState("peers");

  return (
    <Tabs
      defaultValue={tab}
      onValueChange={(v) => setTab(v)}
      value={tab}
      className={"pt-10 pb-0 mb-0"}
    >
      <TabsList justify={"start"} className={"px-8"}>
        <TabsTrigger value={"peers"}>
          <MonitorSmartphoneIcon size={16} />
          Peers
        </TabsTrigger>

        <TabsTrigger value={"users"}>
          <UserIcon size={16} />
          Users
        </TabsTrigger>

        <TabsTrigger value={"policies"}>
          <ShieldCheckIcon size={16} />
          Policies
        </TabsTrigger>

        <TabsTrigger value={"resources"}>
          <ServerIcon size={16} />
          Resources
        </TabsTrigger>

        <TabsTrigger value={"network-routes"}>
          <RouteIcon size={16} />
          Network Routes
        </TabsTrigger>

        <TabsTrigger value={"nameservers"}>
          <GlobeIcon size={16} />
          Nameservers
        </TabsTrigger>

        <TabsTrigger value={"setup-keys"}>
          <KeyIcon size={16} />
          Setup Keys
        </TabsTrigger>
      </TabsList>

      <TabsContent value={"peers"} className={"pb-8"}>
        <GroupPeersSection group={group} />
      </TabsContent>

      <TabsContent value={"users"} className={"pb-8"}>
        <GroupUsersSection users={group.users} />
      </TabsContent>

      <TabsContent value={"policies"} className={"pb-8"}>
        <GroupPoliciesSection policies={group.policies} />
      </TabsContent>

      <TabsContent value={"resources"} className={"pb-8"}>
        <GroupResourcesSection resources={group.networkResource} />
      </TabsContent>

      <TabsContent value={"network-routes"} className={"pb-8"}>
        <GroupNetworkRoutesSection peerRoutes={group.routes} />
      </TabsContent>

      <TabsContent value={"nameservers"} className={"pb-8"}>
        <GroupNameserversSection nameserverGroups={group.nameservers} />
      </TabsContent>

      <TabsContent value={"setup-keys"} className={"pb-8"}>
        <GroupSetupKeysSection setupKeys={group.setupKeys} />
      </TabsContent>
    </Tabs>
  );
};

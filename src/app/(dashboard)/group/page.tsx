"use client";
import { notify } from "@components/Notification";
import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import useRedirect from "@hooks/useRedirect";
import useFetchApi, { useApiCall } from "@utils/api";
import {
  ExternalLinkIcon,
  FolderGit2Icon,
  KeyIcon,
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  PencilIcon,
  ServerIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import type { Group } from "@/interfaces/Group";
import PageContainer from "@/layouts/PageContainer";
import { SetupKey } from "@/interfaces/SetupKey";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";

export default function GroupPage() {
  const queryParameter = useSearchParams();
  const { isRestricted } = usePermissions();
  const groupId = queryParameter.get("id");
  const {
    data: group,
    isLoading,
    error,
  } = useFetchApi<Group>("/groups/" + groupId, true);

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
          "The Group you are attempting to access cannot be found. It may have been deleted, or you may not have permission to view it. Please verify the URL or return to the dashboard."
        }
      />
    );

  return group && !isLoading ? (
    <GroupOverview group={group} />
  ) : (
    <FullScreenLoading />
  );
}

function GroupOverview({ group }: { group: Group }) {
  return (
    <PageContainer>
      <RoutesProvider>
        <div className={"p-default py-6 pb-0"}>
          <Breadcrumbs>
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


const GroupGeneralInformation = ({ group }: { group: Group }) => {
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

function GroupInformationCard({ group }: { group: Group }) {
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

const GroupOverviewTabs = ({ group }: { group: Group }) => {
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
          <UsersIcon size={16} />
          Peers ({group.peers_count})
        </TabsTrigger>

        <TabsTrigger value={"resources"}>
          <ServerIcon size={16} />
          Resources ({group.resources_count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={"peers"} className={"pb-8"}>
        <GroupPeersSection group={group} />
      </TabsContent>

      <TabsContent value={"resources"} className={"pb-8"}>
        <GroupResourcesSection group={group} />
      </TabsContent>
    </Tabs>
  );
};

// Peer List Component for the Peers tab
const GroupPeersSection = ({ group }: { group: Group }) => {
  return (
    <div className="p-default">
      <div className="mb-6">
        <h3 className="text-lg font-medium">Peers in this Group</h3>
        <p className="text-nb-gray-300 text-sm">
          List of all peers that are members of this group
        </p>
      </div>

      <Card>
        <Card.List>
          {group.peers && group.peers.length > 0 ? (
            group.peers.map((peer) => {
              //todo : @Eduard can you check this
              if (typeof peer === "string" || !peer?.id) return null;
              return (<Card.ListItem
                key={peer.id}
                label={
                  <div className="flex items-center gap-2">
                    <MonitorSmartphoneIcon size={14} />
                    <span>{peer.name}</span>
                  </div>
                }
                value={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-nb-gray-400">ID: {peer.id}</span>
                  </div>
                }
              />
              )
            })) : (
            <div className="p-8 text-center text-nb-gray-400">
              <UsersIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p>No peers assigned to this group</p>
            </div>
          )}
        </Card.List>
      </Card>
    </div>
  );
};
// Resources List Component for the Resources tab
const GroupResourcesSection = ({ group }: { group: Group }) => {
  return (
    <div className="p-default">
      <div className="mb-6">
        <h3 className="text-lg font-medium">Resources in this Group</h3>
        <p className="text-nb-gray-300 text-sm">
          List of all resources that are accessible through this group
        </p>
      </div>

      <Card>
        <Card.List>
          {group.resources && group.resources.length > 0 ? (
            group.resources.map((resource) => {
              //todo : @Eduard can you check this 
              if (typeof resource === "string" || !resource?.id) return null;
              return (<Card.ListItem
                key={resource.id}
                label={
                  <div className="flex items-center gap-2">
                    <ServerIcon size={14} />
                    <span className="capitalize">{resource.type}</span>
                  </div>
                }
                value={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-nb-gray-400">ID: {resource.id}</span>
                    <Button variant='secondary' size="sm">
                      <ExternalLinkIcon size={12} />
                    </Button>
                  </div>
                }
              />
              )
            })
          ) : (
            <div className="p-8 text-center text-nb-gray-400">
              <ServerIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p>No resources assigned to this group</p>
            </div>
          )}
        </Card.List>
      </Card>
    </div>
  );
};

"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useRedirect from "@hooks/useRedirect";
import { IconCirclePlus, IconSettings2 } from "@tabler/icons-react";
import useFetchApi, { useApiCall } from "@utils/api";
import { generateColorFromString } from "@utils/helpers";
import dayjs from "dayjs";
import {
  Ban,
  GalleryHorizontalEnd,
  History,
  KeyRoundIcon,
  Mail,
  MonitorSmartphoneIcon,
  User2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { Role, User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import AccessTokensTable from "@/modules/access-tokens/AccessTokensTable";
import CreateAccessTokenModal from "@/modules/access-tokens/CreateAccessTokenModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroupIdsToGroups } from "@/modules/groups/useGroupIdsToGroups";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import { UserPeersSection } from "@/modules/users/UserPeersSection";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";

export default function UserPage() {
  const { t } = useI18n();
  const queryParameter = useSearchParams();
  const userId = queryParameter.get("id");
  const { permission } = usePermissions();
  const isServiceUser = queryParameter.get("service_user") === "true";
  const { data: users, isLoading } = useFetchApi<User[]>(
    `/users?service_user=${isServiceUser}`,
  );
  const { isOwnerOrAdmin } = useLoggedInUser();

  const user = useMemo(() => {
    return users?.find((u) => u.id === userId);
  }, [users, userId]);

  useRedirect("/team/users", false, !userId);

  const userGroups = useGroupIdsToGroups(user?.auto_groups);

  if (!permission.users.read) {
    return (
      <PageContainer>
        <RestrictedAccess page={t("userDetails.title")} />
      </PageContainer>
    );
  }

  if (!isOwnerOrAdmin && user && !isLoading) {
    return <UserOverview user={user} initialGroups={[]} />;
  }

  if (isOwnerOrAdmin && user && !isLoading && userGroups) {
    return <UserOverview user={user} initialGroups={userGroups} />;
  }

  return <FullScreenLoading />;
}

type Props = {
  user: User;
  initialGroups: Group[];
};

function UserOverview({ user, initialGroups }: Readonly<Props>) {
  const { t } = useI18n();
  const router = useRouter();
  const userRequest = useApiCall<User>("/users");
  const isServiceUser = !!user?.is_service_user;
  const { mutate } = useSWRConfig();
  const { loggedInUser, isOwnerOrAdmin, isUser } = useLoggedInUser();
  const isLoggedInUser = loggedInUser ? loggedInUser?.id === user.id : false;
  const { permission } = usePermissions();

  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: initialGroups,
    });

  const [role, setRole] = useState(user.role || Role.User);
  const { hasChanges, updateRef: updateChangesRef } = useHasChanges([
    role,
    selectedGroups,
  ]);

  const save = async () => {
    const groups = await saveGroups();
    const groupIds = groups.map((group) => group.id) as string[];

    notify({
      title: user.name,
      description: t("userDetails.saved"),
      promise: userRequest
        .put(
          {
            role: role,
            auto_groups: groupIds,
            is_blocked: user.is_blocked,
          },
          `/${user.id}`,
        )
        .then(() => {
          mutate(`/users?service_user=${isServiceUser}`);
          updateChangesRef([role, selectedGroups]);
        }),
      loadingMessage: t("userDetails.saving"),
    });
  };

  const isProfilePage = !!user?.is_current && !isServiceUser;
  const canViewTokens = permission?.pats?.read;
  const canViewPeers = permission?.peers?.read;

  const showAccessTokens = (user?.is_current || isServiceUser) && canViewTokens;
  const showPeers = !isServiceUser && canViewPeers;
  const showTabs = isProfilePage && showPeers && showAccessTokens;
  const showSeparator = !showTabs;

  const [tab, setTab] = useState(isServiceUser ? "access-tokens" : "peers");

  return (
    <PageContainer>
      <div className={"p-default py-6 mb-4"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={t("team.title")}
            disabled={!permission.users.read}
            icon={<TeamIcon size={13} />}
          />

          {isServiceUser ? (
            <Breadcrumbs.Item
              href={"/team/service-users"}
              label={t("serviceUsers.title")}
              icon={<IconSettings2 size={17} />}
            />
          ) : (
            <Breadcrumbs.Item
              href={"/team/users"}
              label={t("users.title")}
              disabled={!permission.users.read}
              icon={<User2 size={16} />}
            />
          )}

          <Breadcrumbs.Item label={user.name || user.id} active />
        </Breadcrumbs>

        <div className={"flex justify-between max-w-6xl"}>
          <div>
            <div className={"flex items-center gap-3"}>
              <div
                className={
                  "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
                }
                style={
                  isServiceUser
                    ? {
                        color: "white",
                      }
                    : {
                        color: user?.name
                          ? generateColorFromString(
                              user?.name || user?.id || t("users.system"),
                            )
                          : "#808080",
                      }
                }
              >
                {isServiceUser ? (
                  <IconSettings2 size={16} />
                ) : (
                  user?.name?.charAt(0) || user?.id?.charAt(0)
                )}
              </div>
              <h1 className={"flex items-center gap-3"} title={user?.id}>
                {user.name || user.id}
              </h1>
            </div>
          </div>
          {!isUser && (
            <div className={"flex gap-4"}>
              <Button
                variant={"default"}
                className={"w-full"}
                onClick={() => {
                  isServiceUser
                    ? router.push("/team/service-users")
                    : router.push("/team/users");
                }}
              >
                {t("actions.cancel")}
              </Button>

              <Button
                variant={"primary"}
                className={"w-full"}
                disabled={!hasChanges || !permission.users.update}
                onClick={save}
                data-cy={"save-changes"}
              >
                {t("actions.saveChanges")}
              </Button>
            </div>
          )}
        </div>

        <div className={"flex gap-10 w-full mt-8 max-w-6xl items-start"}>
          <UserInformationCard user={user} />
          <div className={"flex flex-col gap-8 w-1/2 "}>
            {!isServiceUser && isOwnerOrAdmin && (
              <div>
                <Label>{t("userDetails.autoAssignedGroups")}</Label>
                <HelpText>{t("userDetails.autoAssignedGroupsHelp")}</HelpText>
                <PeerGroupSelector
                  disabled={isUser}
                  onChange={setSelectedGroups}
                  values={selectedGroups}
                  hideAllGroup={true}
                  dataCy={"user-group-selector"}
                />
              </div>
            )}
            <div className={"flex items-start"}>
              <div className={"w-2/3"}>
                <Label>{t("userDetails.userRole")}</Label>
                <HelpText>{t("userDetails.userRoleHelp")}</HelpText>
              </div>
              <div className={"w-1/3"}>
                <UserRoleSelector
                  value={role}
                  onChange={setRole}
                  hideOwner={isServiceUser}
                  currentUser={user}
                  disabled={isLoggedInUser || !permission.users.update}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSeparator && <Separator />}

      <Tabs
        defaultValue={tab}
        onValueChange={setTab}
        value={tab}
        className={"pb-0 mb-0"}
      >
        <TabsList justify={"start"} className={"px-8"} hidden={!showTabs}>
          {showPeers && (
            <TabsTrigger value={"peers"}>
              <MonitorSmartphoneIcon size={16} />
              {t("peers.title")}
            </TabsTrigger>
          )}
          {showAccessTokens && (
            <TabsTrigger value={"access-tokens"}>
              <KeyRoundIcon size={16} />
              {t("accessTokens.title")}
            </TabsTrigger>
          )}
        </TabsList>
        {showPeers && (
          <TabsContent value={"peers"} className={"pb-8"}>
            <UserPeersSection user={user} />
          </TabsContent>
        )}
        {showAccessTokens && (
          <TabsContent value={"access-tokens"} className={"pb-8"}>
            <div className={"px-8"}>
              <div className={"max-w-6xl"}>
                <div className={"flex justify-between items-center"}>
                  <div>
                    <h2>{t("accessTokens.title")}</h2>
                    <Paragraph>{t("userDetails.accessTokensDescription")}</Paragraph>
                  </div>
                  <div className={"inline-flex gap-4 justify-end"}>
                    <div>
                      <CreateAccessTokenModal user={user}>
                        <Button
                          variant={"primary"}
                          data-cy={"access-token-open-modal"}
                          disabled={!permission.pats.create}
                        >
                          <IconCirclePlus size={16} />
                          {t("userDetails.createAccessToken")}
                        </Button>
                      </CreateAccessTokenModal>
                    </div>
                  </div>
                </div>
                <AccessTokensTable user={user} />
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}

function UserInformationCard({ user }: Readonly<{ user: User }>) {
  const { t } = useI18n();
  const isServiceUser = user.is_service_user || false;
  const neverLoggedIn = dayjs(user.last_login).isBefore(
    dayjs().subtract(1000, "years"),
  );
  const isPendingApproval = user?.pending_approval;

  return (
    <Card>
      <Card.List>
        <Card.ListItem
          label={
            <>
              <User2 size={16} />
              {user.name ? t("userDetails.name") : t("userDetails.userId")}
            </>
          }
          value={user.name || user.id}
        />

        {!isServiceUser && (
          <Card.ListItem
            label={
              <>
                <Mail size={16} />
                {t("userDetails.email")}
              </>
            }
            value={user.email || "-"}
          />
        )}

        <Card.ListItem
          tooltip={false}
          label={
            <>
              <GalleryHorizontalEnd size={16} />
              {t("table.status")}
            </>
          }
          value={<UserStatusCell user={user} />}
        />

        {!isServiceUser && (
          <>
            {!user.is_current &&
              user.role != Role.Owner &&
              !isPendingApproval && (
                <Card.ListItem
                  tooltip={false}
                  label={
                    <>
                      <Ban size={16} />
                      {t("table.blockUser")}
                    </>
                  }
                  value={<UserBlockCell user={user} isUserPage={true} />}
                />
              )}

            <Card.ListItem
              label={
                <>
                  <History size={16} />
                  {t("table.lastLogin")}
                </>
              }
              value={
                neverLoggedIn
                  ? t("userDetails.never")
                  : dayjs(user.last_login).format(t("userDetails.lastLoginFormat")) +
                    " (" +
                    dayjs().to(user.last_login) +
                    ")"
              }
            />
          </>
        )}
      </Card.List>
    </Card>
  );
}

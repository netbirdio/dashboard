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
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { IconCirclePlus, IconSettings2 } from "@tabler/icons-react";
import useFetchApi, { useApiCall } from "@utils/api";
import { generateColorFromString } from "@utils/helpers";
import dayjs from "dayjs";
import { Ban, GalleryHorizontalEnd, History, Mail, User2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Role, User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import AccessTokensTable from "@/modules/access-tokens/AccessTokensTable";
import CreateAccessTokenModal from "@/modules/access-tokens/CreateAccessTokenModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";

export default function UserPage() {
  const queryParameter = useSearchParams();
  const userId = queryParameter.get("id");
  const isServiceUser = queryParameter.get("service_user") === "true";
  const { data: users, isLoading } = useFetchApi<User[]>(
    `/users?service_user=${isServiceUser}`,
  );

  const user = useMemo(() => {
    return users?.find((u) => u.id === userId);
  }, [users, userId]);

  return !isLoading && user ? (
    <UserOverview user={user} />
  ) : (
    <FullScreenLoading />
  );
}

type Props = {
  user: User;
};

function UserOverview({ user }: Props) {
  const router = useRouter();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const { loggedInUser, isOwnerOrAdmin } = useLoggedInUser();
  const isLoggedInUser = loggedInUser ? loggedInUser?.id === user.id : false;

  const initialGroups = user.auto_groups;
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
      description: "Changes successfully saved.",
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
          mutate(`/users?service_user=${user.is_service_user}`);
          updateChangesRef([role, selectedGroups]);
        }),
      loadingMessage: "Saving changes...",
    });
  };

  return (
    <PageContainer>
      <div className={"p-default py-6 mb-4"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={"Team"}
            icon={<TeamIcon size={13} />}
          />

          {user.is_service_user ? (
            <Breadcrumbs.Item
              href={"/team/service-users"}
              label={"Service Users"}
              icon={<IconSettings2 size={17} />}
            />
          ) : (
            <Breadcrumbs.Item
              href={"/team/users"}
              label={"Users"}
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
                  user.is_service_user
                    ? {
                        color: "white",
                      }
                    : {
                        color: user?.name
                          ? generateColorFromString(
                              user?.name || user?.id || "System User",
                            )
                          : "#808080",
                      }
                }
              >
                {user.is_service_user ? (
                  <IconSettings2 size={16} />
                ) : (
                  user?.name?.charAt(0) || user?.id?.charAt(0)
                )}
              </div>
              <h1 className={"flex items-center gap-3"}>
                {user.name || user.id}
              </h1>
            </div>
          </div>
          <div className={"flex gap-4"}>
            <Button
              variant={"default"}
              className={"w-full"}
              onClick={() => {
                user.is_service_user
                  ? router.push("/team/service-users")
                  : router.push("/team/users");
              }}
            >
              Cancel
            </Button>

            <Button
              variant={"primary"}
              className={"w-full"}
              disabled={!hasChanges}
              onClick={save}
            >
              Save Changes
            </Button>
          </div>
        </div>

        <div className={"flex gap-10 w-full mt-8 max-w-6xl"}>
          <UserInformationCard user={user} />
          <div className={"flex flex-col gap-8 w-1/2 "}>
            {!user.is_service_user && (
              <div>
                <Label>Auto-assigned groups</Label>
                <HelpText>
                  Groups will be assigned to peers added by this user.
                </HelpText>
                <PeerGroupSelector
                  onChange={setSelectedGroups}
                  values={selectedGroups}
                />
              </div>
            )}
            <div className={"flex items-start"}>
              <div className={"w-2/3"}>
                <Label>User Role</Label>
                <HelpText>
                  Set a role for the user to assign access permissions.
                </HelpText>
              </div>
              <div className={"w-1/3"}>
                <UserRoleSelector
                  value={role}
                  onChange={setRole}
                  disabled={
                    isLoggedInUser ||
                    !isOwnerOrAdmin ||
                    user.role === Role.Owner
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {(user.is_current || user.is_service_user) && (
        <>
          <Separator />
          <div className={"px-8 py-6"}>
            <div className={"max-w-6xl"}>
              <div className={"flex justify-between items-center"}>
                <div>
                  <h2>Access Tokens</h2>
                  <Paragraph>
                    Access tokens give access to NetBird API.
                  </Paragraph>
                </div>
                <div className={"inline-flex gap-4 justify-end"}>
                  <div>
                    <CreateAccessTokenModal user={user}>
                      <Button variant={"primary"}>
                        <IconCirclePlus size={16} />
                        Create Access Token
                      </Button>
                    </CreateAccessTokenModal>
                  </div>
                </div>
              </div>
              <AccessTokensTable user={user} />
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

function UserInformationCard({ user }: { user: User }) {
  const isServiceUser = user.is_service_user || false;

  return (
    <Card>
      <Card.List>
        <Card.ListItem
          label={
            <>
              <User2 size={16} />
              {user.name ? "Name" : "User ID"}
            </>
          }
          value={user.name || user.id}
        />

        {!isServiceUser && (
          <Card.ListItem
            label={
              <>
                <Mail size={16} />
                E-Mail
              </>
            }
            value={user.email || "-"}
          />
        )}

        <Card.ListItem
          label={
            <>
              <GalleryHorizontalEnd size={16} />
              Status
            </>
          }
          value={<UserStatusCell user={user} />}
        />

        {!isServiceUser && (
          <>
            <Card.ListItem
              label={
                <>
                  <Ban size={16} />
                  Block User
                </>
              }
              value={<UserBlockCell user={user} isUserPage={true} />}
            />
            <Card.ListItem
              label={
                <>
                  <History size={16} />
                  Last login
                </>
              }
              value={
                dayjs(user.last_login).format("D MMMM, YYYY [at] h:mm A") +
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

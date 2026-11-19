import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { uniq } from "lodash";
import React, { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";

type Props = {
  user: User;
};
export default function UserGroupCell({ user }: Readonly<Props>) {
  const t = useTranslations();
  const { groups, isLoading } = useGroups();
  const [modal, setModal] = useState(false);
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const userRequest = useApiCall<User>("/users");

  const allGroups = useMemo(() => {
    if (isLoading) return [];
    return uniq(user.auto_groups)
      .map((group) => groups?.find((g) => g?.id == group))
      .filter((g): g is Group => g !== undefined);
  }, [user.auto_groups, groups, isLoading]);

  const userGroupIds = useMemo(() => {
    return (allGroups.map((group) => group.id) as string[]) || [];
  }, [allGroups]);

  if (isLoading)
    return (
      <div className={"flex gap-2"}>
        <Skeleton height={34} width={90} />
        <Skeleton height={34} width={45} />
      </div>
    );

  const handleSave = async (promises: Promise<Group>[]) => {
    if (!user) return;

    const groups = await Promise.all(promises);
    const groupIds =
      groups?.map((group) => group?.id).filter((id) => id !== undefined) || [];

    notify({
      title: user?.name || user?.email || "User",
      description: t("users.groupsSaved"),
      promise: userRequest
        .put(
          {
            ...user,
            auto_groups: groupIds,
          },
          `/${user.id}`,
        )
        .then(() => {
          setModal(false);
          mutate(`/users?service_user=false`);
          mutate(`/integrations/msp/switcher`);
          mutate("/groups");
        }),
      loadingMessage: t("users.updatingGroups"),
    });
  };

  return (
    <GroupsRow
      label={t("users.autoAssignedGroups")}
      description={t("users.autoAssignedGroupsHelp")}
      groups={userGroupIds}
      onSave={handleSave}
      hideAllGroup={true}
      disabled={!permission.users.update}
      showAddGroupButton={permission.users.update}
      modal={modal}
      setModal={setModal}
      countOnly={true}
    />
  );
}

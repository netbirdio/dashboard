import { InfoIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { AuthorizedGroups } from "@/interfaces/Policy";
import GroupBadge from "@components/ui/GroupBadge";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";
import { useUsers } from "@/contexts/UsersProvider";
import { cn } from "@utils/helpers";
import { Callout } from "@components/Callout";
import { SSHUsernameSelector } from "@/modules/access-control/ssh/SSHUsernameSelector";

type Props = {
  sourceGroups?: Group[];
  accessType?: "full" | "limited";
  authorizedGroups?: AuthorizedGroups;
  setAuthorizedGroups?: (authorizedGroups: AuthorizedGroups) => void;
};

export function SSHAuthorizedGroups({
  sourceGroups,
  authorizedGroups,
  setAuthorizedGroups,
  accessType,
}: Props) {
  const isEmpty =
    !authorizedGroups || Object.keys(authorizedGroups).length === 0;

  useEffect(() => {
    if (sourceGroups) {
      let groupsMap: AuthorizedGroups = {};
      sourceGroups.forEach((sourceGroup) => {
        if (!sourceGroup?.name) return;

        const groupId = sourceGroup?.id;
        if (groupId) {
          groupsMap[sourceGroup.name] = authorizedGroups?.[groupId] || [];
        } else {
          groupsMap[sourceGroup.name] = [];
        }
      });
      setAuthorizedGroups?.(groupsMap);
    }
  }, [sourceGroups]);

  const handleUserNamesChange = useCallback(
    (groupName: string, values: string[]) => {
      setAuthorizedGroups?.({
        ...authorizedGroups,
        [groupName]: values || [],
      });
    },
    [authorizedGroups, setAuthorizedGroups],
  );

  if (accessType === "full") return;

  if ((accessType === "limited" && isEmpty) || !authorizedGroups) {
    return (
      <Callout
        variant={"info"}
        icon={<InfoIcon size={14} className={"shrink-0 relative top-[3px]"} />}
        className="mt-3 py-[.75rem]"
      >
        You have not added any source groups yet, please add source groups in
        order to specify which user group has access to which system users on
        the destination machines.
      </Callout>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md overflow-hidden mt-3 py-2",
        "border border-nb-gray-900 bg-nb-gray-920/30",
      )}
    >
      {Object.entries(authorizedGroups).map(([groupName, usernames]) => (
        <AuthorizedUserRow
          key={groupName}
          groupName={groupName}
          usernames={usernames}
          sourceGroups={sourceGroups}
          handleUserNamesChange={(values) =>
            handleUserNamesChange(groupName, values)
          }
        />
      ))}
    </div>
  );
}

type RowProps = {
  sourceGroups?: Group[];
  groupName: string;
  usernames: string[];
  handleUserNamesChange: (usernames: string[]) => void;
};

function AuthorizedUserRow({
  sourceGroups,
  usernames,
  groupName,
  handleUserNamesChange,
}: RowProps) {
  const { users } = useUsers();

  const group = useMemo(
    () => sourceGroups?.find((g) => g.name === groupName),
    [sourceGroups, groupName],
  );

  const usersOfGroup = useMemo(
    () =>
      users?.filter((user) => user.auto_groups.includes(group?.id || "")) || [],
    [users, group],
  );

  return (
    group && (
      <div className="flex gap-6 w-full items-center py-2 px-4">
        <div className={"flex items-center gap-2 col-span-3"}>
          <GroupBadge group={group} showNewBadge={true} />
          <HorizontalUsersStack users={usersOfGroup} />
        </div>
        <div
          className={
            "flex items-center gap-4 min-w-[340px] max-w-[340px] ml-auto"
          }
        >
          <SSHUsernameSelector
            onChange={handleUserNamesChange}
            values={usernames}
          />
        </div>
      </div>
    )
  );
}

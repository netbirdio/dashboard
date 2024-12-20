import MultipleGroups from "@components/ui/MultipleGroups";
import { uniq } from "lodash";
import React, { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  user: User;
};
export default function UserGroupCell({ user }: Readonly<Props>) {
  const { groups, isLoading } = useGroups();

  const allGroups = useMemo(() => {
    if (isLoading) return [];
    return uniq(user.auto_groups)
      .map((group) => groups?.find((g) => g?.id == group))
      .filter((g): g is Group => g !== undefined);
  }, [user.auto_groups, groups, isLoading]);

  if (isLoading)
    return (
      <div className={"flex gap-2"}>
        <Skeleton height={34} width={90} />
        <Skeleton height={34} width={45} />
      </div>
    );

  return allGroups.length == 0 ? (
    <EmptyRow />
  ) : (
    <MultipleGroups groups={allGroups} />
  );
}

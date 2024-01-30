import MultipleGroups from "@components/ui/MultipleGroups";
import React, { useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  user: User;
};
export default function UserGroupCell({ user }: Props) {
  const { groups } = useGroups();

  const [allGroups] = useState(() => {
    return user.auto_groups
      .map((group) => {
        return groups?.find((g) => g.id == group);
      })
      .filter((g) => g != undefined) as Group[];
  });

  return allGroups.length == 0 ? (
    <EmptyRow />
  ) : (
    <MultipleGroups groups={allGroups} />
  );
}

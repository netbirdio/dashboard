import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Route } from "@/interfaces/Route";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  route: Route;
};
export default function RouteAccessControlGroups({ route }: Props) {
  const { groups } = useGroups();
  if (!route?.access_control_groups) return <EmptyRow />;

  const allGroups = route?.access_control_groups
    .map((group) => {
      return groups?.find((g) => g.id == group);
    })
    .filter((g) => g != undefined) as Group[];

  return <MultipleGroups groups={allGroups} />;
}

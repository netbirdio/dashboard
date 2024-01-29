import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function RouteDistributionGroupsCell({ route }: Props) {
  const { groups } = useGroups();

  const allGroups = route.groups
    .map((group) => {
      return groups?.find((g) => g.id == group);
    })
    .filter((g) => g != undefined) as Group[];

  return <MultipleGroups groups={allGroups} />;
}

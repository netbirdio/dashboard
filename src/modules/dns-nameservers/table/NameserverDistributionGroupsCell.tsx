import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverDistributionGroupsCell({ ns }: Props) {
  const { groups } = useGroups();

  const allGroups = ns.groups
    .map((group) => {
      return groups?.find((g) => g.id == group);
    })
    .filter((g) => g != undefined) as Group[];

  return <MultipleGroups groups={allGroups} />;
}

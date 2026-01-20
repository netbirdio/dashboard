import MultipleGroups, {
  TransparentEditIconButton,
} from "@components/ui/MultipleGroups";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};

export default function NameserverDistributionGroupsCell({ ns }: Props) {
  const { groups } = useGroups();
  const { permission } = usePermissions();
  const canUpdate = permission?.nameservers?.update;

  const allGroups = ns.groups
    .map((group) => {
      return groups?.find((g) => g.id == group);
    })
    .filter((g) => g != undefined) as Group[];

  return (
    <div className={cn("flex items-center gap-1", canUpdate && "group")}>
      <MultipleGroups groups={allGroups} />
      {canUpdate && <TransparentEditIconButton />}
    </div>
  );
}

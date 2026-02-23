import MultipleGroups, {
  TransparentEditIconButton,
} from "@components/ui/MultipleGroups";
import { cn } from "@utils/helpers";
import React, { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { AccessControlResourceCell } from "@/modules/access-control/table/AccessControlResourceCell";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  policy: Policy;
  hideEdit?: boolean;
  disableRedirect?: boolean;
};

export default function AccessControlSourcesCell({
  policy,
  hideEdit = false,
  disableRedirect = false,
}: Props) {
  const { permission } = usePermissions();
  const canUpdate = permission?.policies?.update;

  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  if (firstRule?.sourceResource) {
    return <AccessControlResourceCell resource={firstRule.sourceResource} />;
  }

  return firstRule ? (
    <div
      className={cn(
        "flex items-center gap-1",
        canUpdate && !hideEdit && "group",
      )}
    >
      <MultipleGroups
        groups={firstRule.sources as Group[]}
        showUsers={firstRule.protocol === "netbird-ssh"}
        disableRedirect={disableRedirect}
      />
      {canUpdate && !hideEdit && <TransparentEditIconButton />}
    </div>
  ) : (
    <EmptyRow />
  );
}

import MultipleGroups from "@components/ui/MultipleGroups";
import React, { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { AccessControlResourceCell } from "@/modules/access-control/table/AccessControlResourceCell";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  policy: Policy;
};
export default function AccessControlSourcesCell({ policy }: Props) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  if (firstRule?.sourceResource) {
    return <AccessControlResourceCell resource={firstRule.sourceResource} />;
  }

  return firstRule ? (
    <MultipleGroups groups={firstRule.sources as Group[]} />
  ) : (
    <EmptyRow />
  );
}

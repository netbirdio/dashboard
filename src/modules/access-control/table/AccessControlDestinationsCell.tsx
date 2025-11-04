import MultipleGroups from "@components/ui/MultipleGroups";
import React, { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { AccessControlResourceCell } from "@/modules/access-control/table/AccessControlResourceCell";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  policy: Policy;
};
export default function AccessControlDestinationsCell({
  policy,
}: Readonly<Props>) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  if (firstRule?.destinationResource) {
    return (
      <AccessControlResourceCell resource={firstRule.destinationResource} />
    );
  }

  return firstRule ? (
    <MultipleGroups groups={firstRule.destinations as Group[]} />
  ) : (
    <EmptyRow />
  );
}

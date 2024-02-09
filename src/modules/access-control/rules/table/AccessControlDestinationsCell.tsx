import MultipleGroups from "@components/ui/MultipleGroups";
import React, { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlDestinationsCell({ policy }: Props) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  return firstRule ? (
    <MultipleGroups groups={firstRule.destinations as Group[]} />
  ) : null;
}

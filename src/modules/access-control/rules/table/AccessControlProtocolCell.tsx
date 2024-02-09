import Badge from "@components/Badge";
import { Share2 } from "lucide-react";
import React, { useMemo } from "react";
import { Policy } from "@/interfaces/Policy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  policy: Policy;
};
export default function AccessControlProtocolCell({ policy }: Props) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  return firstRule ? (
    <div className={"flex"}>
      <Badge
        variant={"gray"}
        className={"uppercase tracking-wider font-medium"}
      >
        <Share2 size={12} />
        {firstRule.protocol}
      </Badge>
    </div>
  ) : (
    <EmptyRow />
  );
}

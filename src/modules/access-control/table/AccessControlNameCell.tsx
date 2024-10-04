import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import React from "react";
import { Policy } from "@/interfaces/Policy";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  policy: Policy;
};

export default function AccessControlNameCell({ policy }: Readonly<Props>) {
  return (
    <ActiveInactiveRow
      active={policy.enabled}
      inactiveDot={"gray"}
      text={policy.name}
      dataCy={policy.name}
    >
      <DescriptionWithTooltip className={"mt-1"} text={policy.description} />
    </ActiveInactiveRow>
  );
}

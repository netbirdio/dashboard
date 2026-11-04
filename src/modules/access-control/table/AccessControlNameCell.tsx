import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import React from "react";
import { Policy } from "@/interfaces/Policy";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  policy: Policy;
  fluid?: boolean;
};

export default function AccessControlNameCell({
  policy,
  fluid = false,
}: Readonly<Props>) {
  return (
    <ActiveInactiveRow
      active={policy.enabled}
      inactiveDot={"gray"}
      text={policy.name}
      data-testid={policy.name}
      fluid={fluid}
    >
      <DescriptionWithTooltip
        className={"mt-1"}
        text={policy.description}
        fluid={fluid}
      />
    </ActiveInactiveRow>
  );
}

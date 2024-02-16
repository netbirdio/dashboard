import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  check: PostureCheck;
};
export const PostureCheckNameCell = ({ check }: Props) => {
  return (
    <ActiveInactiveRow
      active={check.active || false}
      inactiveDot={"gray"}
      text={check.name}
    >
      <DescriptionWithTooltip className={"mt-1"} text={check.description} />
    </ActiveInactiveRow>
  );
};

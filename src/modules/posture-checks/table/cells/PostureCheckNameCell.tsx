import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  check: PostureCheck;
  small?: boolean;
};
export const PostureCheckNameCell = ({ check, small }: Props) => {
  return !small ? (
    <ActiveInactiveRow
      active={check.active || false}
      inactiveDot={"gray"}
      text={check.name}
    >
      <DescriptionWithTooltip
        className={"mt-1"}
        text={check.description}
        maxChars={30}
      />
    </ActiveInactiveRow>
  ) : (
    <div className={"flex items-center gap-4 min-w-[350px]"}>
      <div className={"flex flex-col gap-0.5 min-w-0 max-w-[300px]"}>
        <div className={"text-sm text-gray-800 dark:text-nb-gray-100 truncate"}>{check.name}</div>
        <DescriptionWithTooltip
          className={"text-xs"}
          text={check.description}
          maxChars={30}
        />
      </div>
    </div>
  );
};

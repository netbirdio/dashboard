import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import React from "react";
import { NameserverGroup } from "@/interfaces/Nameserver";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverNameCell({ ns }: Props) {
  return (
    <div className={"flex min-w-[270px] max-w-[270px]"}>
      <div
        className={
          "group flex items-center gap-2 interactive-cell"
        }
      >
        <ActiveInactiveRow
          active={ns.enabled}
          inactiveDot={"gray"}
          text={ns.name}
        >
          <DescriptionWithTooltip className={"mt-1"} text={ns.description} />
        </ActiveInactiveRow>
      </div>
    </div>
  );
}

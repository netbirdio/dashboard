import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  exitNode: ExitNode;
};

/** Expand chevron, active dot, name and description; the chevron sits on the name's line. */
export default function ExitNodeNameCell({ exitNode }: Readonly<Props>) {
  return (
    <div className={"flex gap-6 items-start min-w-[200px] max-w-[270px]"}>
      <ChevronRightIcon
        size={20}
        className={
          "group-data-[accordion=opened]/accordion:hidden text-nb-gray-400 shrink-0 mt-[1px]"
        }
      />
      <ChevronDown
        size={20}
        className={
          "group-data-[accordion=closed]/accordion:hidden text-nb-gray-400 shrink-0 mt-[1px]"
        }
      />
      <ActiveInactiveRow
        active={exitNode.enabled}
        inactiveDot={"gray"}
        text={exitNode.name}
        data-testid={`exit-node-${exitNode.name}`}
      >
        <DescriptionWithTooltip
          className={"mt-1"}
          text={exitNode.description}
        />
      </ActiveInactiveRow>
    </div>
  );
}

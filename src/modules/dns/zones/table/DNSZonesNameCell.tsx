import { cn } from "@utils/helpers";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { DNSZone } from "@/interfaces/DNS";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  zone: DNSZone;
};

export const DNSZonesNameCell = ({ zone }: Props) => {
  const hasRecords = (zone?.records?.length ?? 0) > 0;

  return (
    <div className={"flex gap-6 items-center min-w-[270px] max-w-[270px]"}>
      <ChevronRightIcon
        size={20}
        className={cn(
          "group-data-[accordion=opened]/accordion:hidden text-nb-gray-400 shrink-0",
          !hasRecords && "cursor-default opacity-0",
        )}
      />
      <ChevronDown
        size={20}
        className={cn(
          "group-data-[accordion=closed]/accordion:hidden text-nb-gray-400 shrink-0",
          !hasRecords && "cursor-default opacity-0",
        )}
      />
      <ActiveInactiveRow
        active={zone.enabled}
        inactiveDot={"gray"}
        text={zone.domain}
        dataCy={zone.id}
      />
    </div>
  );
};

import { cn, formatBytes } from "@utils/helpers";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import * as React from "react";
import { TrafficEvent } from "@/cloud/traffic-events/interfaces/TrafficEvent";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: TrafficEvent;
  showInbound?: boolean;
  showOutbound?: boolean;
};

export const TrafficEventsBytesCell = ({
  event,
  showInbound = true,
  showOutbound = true,
}: Props) => {
  if (
    showInbound &&
    showOutbound &&
    event.rx_bytes === 0 &&
    event.tx_bytes === 0
  )
    return <EmptyRow />;
  if (showInbound && event.rx_bytes === 0 && !showOutbound) return <EmptyRow />;
  if (showOutbound && event.tx_bytes === 0 && !showInbound) return <EmptyRow />;

  return (
    <div className={"flex flex-col text-xs gap-1 text-nb-gray-300 font-medium"}>
      {showInbound && (
        <div className={"flex gap-2 items-center whitespace-nowrap"}>
          <ArrowDownIcon size={15} className={cn("text-sky-400")} />
          {formatBytes(event.rx_bytes)}
        </div>
      )}
      {showOutbound && (
        <div className={"flex gap-2 items-center whitespace-nowrap"}>
          <ArrowUpIcon size={15} className={cn("text-netbird")} />
          {formatBytes(event.tx_bytes)}
        </div>
      )}
    </div>
  );
};

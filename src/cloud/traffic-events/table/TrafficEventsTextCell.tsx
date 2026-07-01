import { cn } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import {
  getTrafficEventCounts,
  TrafficEvent,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventDescription } from "@/cloud/traffic-events/table/TrafficEventDescription";

type Props = {
  event: TrafficEvent;
};

export const TrafficEventsTextCell = ({ event }: Props) => {
  const trafficEvent = useMemo(() => {
    const start = event.events?.find(
      (e) => e.type === TrafficEventType.CONNECTED,
    );
    // Fallback to the other event in case there is no CONNECTED event
    const fallback = event.events?.find(
      (e) => e.type !== TrafficEventType.CONNECTED,
    );
    if (!start) return fallback;
    return start;
  }, [event]);

  const { isAggregated, drops } = getTrafficEventCounts(event);
  // Aggregated rows are a single self-contained summary line — no expansion.
  // Only genuine multi-sub-event rows keep the expand affordance/connector.
  const isExpandable = !isAggregated && event.events?.length > 1;
  // Aggregated rows have no usable events[].type (it's TYPE_UNKNOWN), so color
  // the dot from the counters: red when anything was blocked, else green.
  const isAggregatedBlocked = isAggregated && drops > 0;

  return (
    trafficEvent && (
      <div className={"flex items-start gap-3 py-1.5 relative px-2"}>
        {isExpandable && (
          <div
            className={cn(
              "absolute left-0 top-0 w-[2px]",
              "ml-[11px] mt-[20px] z-0",
              "group-data-[accordion=closed]/accordion:hidden",
              "group-data-[accordion=opened]/accordion:h-full",
              trafficEvent.type === TrafficEventType.STOPPED &&
                "bg-nb-gray-700",
              trafficEvent.type === TrafficEventType.BLOCKED && "bg-red-500",
              trafficEvent.type === TrafficEventType.CONNECTED &&
                "bg-green-500",
            )}
          ></div>
        )}

        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0 mt-[3.5px] mr-0.5 relative z-[1]",
            trafficEvent.type === TrafficEventType.STOPPED && "bg-nb-gray-700",
            trafficEvent.type === TrafficEventType.BLOCKED && "bg-red-500",
            trafficEvent.type === TrafficEventType.CONNECTED && "bg-green-500",
            isAggregated && (isAggregatedBlocked ? "bg-red-500" : "bg-green-500"),
          )}
        ></span>
        <TrafficEventDescription
          event={event}
          type={trafficEvent?.type}
          showCaret={isExpandable}
        />
      </div>
    )
  );
};

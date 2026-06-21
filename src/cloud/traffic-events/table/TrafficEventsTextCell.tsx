import { cn } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import {
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

  const hasOtherEvents = event.events?.length > 1;

  return (
    trafficEvent && (
      <div className={"flex items-start gap-3 py-1.5 relative px-2"}>
        {hasOtherEvents && (
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
          )}
        ></span>
        <TrafficEventDescription
          event={event}
          type={trafficEvent?.type}
          showCaret={event.events.length > 1}
        />
      </div>
    )
  );
};

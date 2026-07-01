import { cn } from "@utils/helpers";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  TrafficEvent,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventDescription } from "@/cloud/traffic-events/table/TrafficEventDescription";

type Props = {
  event: TrafficEvent;
  className?: string;
};

export const TrafficEventsDetailRow = ({ event, className }: Props) => {
  // Skip CONNECTED (drawn as the "start" head) and TYPE_UNKNOWN placeholders.
  // Aggregated rows carry a single TYPE_UNKNOWN event with no timeline meaning,
  // so for those the expanded view shows only the policy row below.
  const otherEvents = event.events.filter(
    (e) =>
      e.type !== TrafficEventType.CONNECTED &&
      e.type !== TrafficEventType.UNKNOWN,
  );
  const { policy } = event;
  const hasPolicy = !!policy?.id;
  const isBlocked = otherEvents.some(
    (e) => e.type === TrafficEventType.BLOCKED,
  );

  return (
    <div
      className={cn("flex gap-10 pb-4 pl-5 ml-[3px] pt-3 mt-[1px]", className)}
    >
      <ul>
        {hasPolicy && <PolicyListItem policy={policy} isBlocked={isBlocked} />}

        {otherEvents.map((e, index) => {
          const isLast = index === otherEvents.length - 1;
          const isFirst = index === 0;
          return (
            <ListItem
              key={e.timestamp}
              event={event}
              type={e.type}
              topLine={isFirst}
              bottomLine={isLast}
            />
          );
        })}
      </ul>
    </div>
  );
};

type ListItemProps = {
  event?: TrafficEvent;
  type?: TrafficEventType;
  bottomLine?: boolean;
  topLine?: boolean;
  children?: React.ReactNode;
  topLineClassName?: string;
};

const ListItem = ({
  event,
  type,
  bottomLine,
  topLine,
  children,
  topLineClassName,
}: ListItemProps) => {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 items-start relative justify-center pl-5 mb-9 ml-[2px]",
      )}
    >
      {/* Top Line */}
      {topLine && (
        <div
          className={cn(
            "absolute left-0 top-0 w-[2px] h-[25px]",
            "-translate-y-full",
            "ml-[1px] mt-[2px] z-0",
            type === TrafficEventType.BLOCKED ? "bg-red-500" : "bg-green-500",
            topLineClassName,
          )}
        ></div>
      )}

      {/* Line Between */}
      <div
        className={cn(
          "absolute left-0 top-0 w-[2px] h-[92%] ",
          "ml-[1px] mt-[14px] z-0",
          type === TrafficEventType.BLOCKED ? "bg-red-500" : "bg-green-500",
          bottomLine && "opacity-0",
        )}
      ></div>

      {/* Circle */}
      <div
        className={cn(
          "w-2 h-2 rounded-full flex items-center justify-center shrink-0",
          "text-green-100",
          "absolute left-0 top-0 mt-1 -ml-[2px]",
          type === TrafficEventType.BLOCKED ? "bg-red-500" : "bg-green-500",
        )}
      ></div>

      {event && type && (
        <TrafficEventDescription event={event} type={type} showCaret={false} />
      )}

      {children && (
        <div
          className={cn(
            "text-nb-gray-250 text-sm min-w-[22rem] max-w-[23rem] font-light",
          )}
        >
          {children}
        </div>
      )}
    </li>
  );
};

const PolicyListItem = ({
  policy,
  isBlocked = false,
}: {
  policy?: { id: string; name: string };
  isBlocked: boolean;
}) => {
  return (
    <ListItem
      topLine={true}
      type={isBlocked ? TrafficEventType.BLOCKED : TrafficEventType.CONNECTED}
      topLineClassName={"bg-green-500"}
    >
      <span
        className={"whitespace-nowrap leading-none flex items-center gap-2"}
      >
        Policy
        <Link href={`/access-control?id=${policy?.id}`}>
          <span
            className={
              "flex gap-1 underline underline-offset-4 decoration-dotted text-nb-gray-100 hover:text-white"
            }
          >
            {policy?.name}
            <ArrowUpRightIcon size={14} />
          </span>
        </Link>
        {isBlocked ? "blocked" : "allowed"} the connection
      </span>
    </ListItem>
  );
};

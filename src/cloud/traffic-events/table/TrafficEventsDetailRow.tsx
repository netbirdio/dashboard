import { cn } from "@utils/helpers";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  getTrafficEventCounts,
  TrafficEvent,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventDescription } from "@/cloud/traffic-events/table/TrafficEventDescription";

type Props = {
  event: TrafficEvent;
  className?: string;
};

export const TrafficEventsDetailRow = ({ event, className }: Props) => {
  // The timeline shows the distinct phases of the (possibly aggregated) flow, so
  // collapse repeated same-type sub-events to a single representative node —
  // otherwise an aggregated row with e.g. many BLOCKED events renders identical
  // duplicate lines. The aggregation summary above already conveys the counts.
  const seenTypes = new Set<TrafficEventType>();
  const otherEvents = event.events.filter((e) => {
    if (e.type === TrafficEventType.CONNECTED) return false;
    if (seenTypes.has(e.type)) return false;
    seenTypes.add(e.type);
    return true;
  });
  const { policy } = event;
  const hasPolicy = !!policy?.id;
  const isBlocked = otherEvents.some(
    (e) => e.type === TrafficEventType.BLOCKED,
  );
  const counts = getTrafficEventCounts(event);
  // The timeline "head" (the node that draws the top stub) is the summary when
  // aggregated, otherwise the policy, otherwise the first event.
  const headIsAboveEvents = counts.isAggregated || hasPolicy;

  return (
    <div
      className={cn("flex flex-col pb-4 pl-5 ml-[3px] pt-3 mt-[1px]", className)}
    >
      <ul>
        {counts.isAggregated && (
          <AggregationSummary
            counts={counts}
            hasFollowingItems={hasPolicy || otherEvents.length > 0}
          />
        )}

        {hasPolicy && (
          <PolicyListItem
            policy={policy}
            isBlocked={isBlocked}
            topLine={!counts.isAggregated}
          />
        )}

        {otherEvents.map((e, index) => {
          const isLast = index === otherEvents.length - 1;
          const isFirst = index === 0;
          return (
            <ListItem
              key={e.timestamp}
              event={event}
              type={e.type}
              topLine={isFirst && !headIsAboveEvents}
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
        "flex flex-col gap-2 items-start relative pl-5 mb-9 ml-[2px]",
      )}
    >
      {/* Top Line */}
      {topLine && (
        <div
          className={cn(
            "absolute left-0 top-0 w-[2px] h-[25px]",
            "-translate-y-full",
            "ml-[1px] mt-[6px] z-0",
            type === TrafficEventType.BLOCKED ? "bg-red-500" : "bg-green-500",
            topLineClassName,
          )}
        ></div>
      )}

      {/* Line Between: spans from this row's circle down to the next row's
          circle, crossing the mb-9 (2.25rem) gap. Anchored top/bottom rather
          than a percentage height so it stays connected for rows of any
          height (e.g. a multi-line summary). */}
      <div
        className={cn(
          "absolute left-0 top-[6px] bottom-[-2.25rem] w-[2px]",
          "ml-[1px] z-0",
          type === TrafficEventType.BLOCKED ? "bg-red-500" : "bg-green-500",
          bottomLine && "opacity-0",
        )}
      ></div>

      {/* Circle */}
      <div
        className={cn(
          "w-2 h-2 rounded-full flex items-center justify-center shrink-0",
          "text-green-100",
          "absolute left-0 top-[6px] -ml-[2px]",
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
  topLine = true,
}: {
  policy?: { id: string; name: string };
  isBlocked: boolean;
  topLine?: boolean;
}) => {
  return (
    <ListItem
      topLine={topLine}
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

type AggregationSummaryProps = {
  counts: ReturnType<typeof getTrafficEventCounts>;
  /** Whether more timeline nodes (policy/events) follow this summary head.
   *  When false this is the only node, so it must hide its connecting line. */
  hasFollowingItems?: boolean;
};

// Natural-language head of the expanded aggregated timeline. It reuses ListItem
// so the same left vertical line + circle wrap it exactly like the policy/event
// rows below, carrying the topLine; the line continues down into them. Each
// count groups its number with "connection(s)" and its verb ("142 connections
// started") and gets an explicit colored underline for quick scanning;
// zero-count clauses are omitted and the rest joined naturally ("a, b and c").
const AggregationSummary = ({
  counts,
  hasFollowingItems = true,
}: AggregationSummaryProps) => {
  const clauses = [
    counts.starts > 0 && (
      <Count
        key={"started"}
        value={counts.starts}
        verb={"started"}
        className={"text-green-400 decoration-green-400"}
      />
    ),
    counts.ends > 0 && (
      <Count
        key={"stopped"}
        value={counts.ends}
        verb={"stopped"}
        className={"text-nb-gray-100 decoration-nb-gray-100"}
      />
    ),
    counts.drops > 0 && (
      <Count
        key={"blocked"}
        value={counts.drops}
        verb={"blocked"}
        className={"text-red-400 decoration-red-400"}
      />
    ),
  ].filter(Boolean) as React.ReactElement[];

  if (clauses.length === 0) return null;

  // A fully-blocked window (only dropped attempts, nothing started or stopped)
  // gets a red timeline node/line, matching the blocked event rows below.
  const isFullyBlocked =
    counts.drops > 0 && counts.starts === 0 && counts.ends === 0;

  return (
    <ListItem
      topLine={true}
      bottomLine={!hasFollowingItems}
      type={isFullyBlocked ? TrafficEventType.BLOCKED : undefined}
    >
      <span className={"leading-relaxed"}>
        During this window{" "}
        {clauses.map((clause, index) => (
          <React.Fragment key={clause.key}>
            {index > 0 && (index === clauses.length - 1 ? " and " : ", ")}
            {clause}
          </React.Fragment>
        ))}
        .
      </span>
    </ListItem>
  );
};

const Count = ({
  value,
  verb,
  className,
}: {
  value: number;
  verb: string;
  className: string;
}) => {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-medium underline decoration-2 underline-offset-4",
        className,
      )}
    >
      {value.toLocaleString()} {value === 1 ? "connection" : "connections"}{" "}
      {verb}
    </span>
  );
};

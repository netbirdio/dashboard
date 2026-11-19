import { defaultLocale } from "@/i18n/locales";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import {
  getTrafficEventCounts,
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventMachine,
  TrafficEventMachineType,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { getTrafficEventTypeText } from "@/cloud/traffic-events/TrafficEventsTable";
import { stripZeroPort } from "@/cloud/traffic-events/utils/parseAddress";
import { usePeers } from "@/contexts/PeersProvider";
import { useTranslations, useDashboardLocale } from "@/i18n/LocaleProvider";

type Props = {
  event: TrafficEvent;
  type: TrafficEventType;
  showCaret?: boolean;
};

const isResource = (m: TrafficEventMachine) => {
  return m.type !== TrafficEventMachineType.PEER;
};

const getNamePrefix = (
  t: ReturnType<typeof useTranslations>,
  m: TrafficEventMachine,
) => {
  switch (m.type) {
    case TrafficEventMachineType.PEER:
      return t("trafficEvents.peer2");
    case TrafficEventMachineType.ROUTE:
      return t("trafficEvents.route");
    case TrafficEventMachineType.UNKNOWN:
      return "";
    default:
      return t("trafficEvents.resource");
  }
};

export const TrafficEventDescription = ({
  event,
  type,
  showCaret = false,
}: Props) => {
  const { locale } = useDashboardLocale();

  const t = useTranslations();
  const { peers } = usePeers();

  const routerName = useMemo(() => {
    const reporter = peers?.find((peer) => peer.id === event.reporter_id);
    return reporter ? (
      <Mark>{reporter.name}</Mark>
    ) : (
      <Mark>{t("common.unknown")}</Mark>
    );
  }, [event.reporter_id, peers, t]);

  const timestamp = event.events?.find((e) => e.type === type)?.timestamp;

  const { isAggregated } = getTrafficEventCounts(event);
  const eventWindow = useMemo(() => {
    if (!event.window_start || !event.window_end) return undefined;
    const first = dayjs(event.window_start);
    const last = dayjs(event.window_end);
    if (!first.isValid() || !last.isValid()) return undefined;
    if (first.isSame(last)) return undefined;
    return { first, last };
  }, [event.window_start, event.window_end]);

  const info = useMemo(() => {
    const isP2P =
      event.source.id === event.reporter_id ||
      event.destination.id === event.reporter_id;
    const isInbound = event.direction === TrafficEventDirection.INGRESS;
    const isOutbound = event.direction === TrafficEventDirection.EGRESS;
    const isStarted = type === TrafficEventType.CONNECTED;
    const isStopped = type === TrafficEventType.STOPPED;
    const isBlocked = type === TrafficEventType.BLOCKED;
    const isDestinationAResource = isResource(event.destination);
    const sourceAddress = stripZeroPort(event.source.address);
    const destinationAddress = stripZeroPort(event.destination.address);
    const sourceName = (
      <>
        {getNamePrefix(t, event.source)}
        <Mark>{event.source.name || sourceAddress}</Mark>
      </>
    );
    const destinationName = (
      <>
        {getNamePrefix(t, event.destination)}
        <Mark>{event.destination.name || destinationAddress}</Mark>
      </>
    );

    return {
      isP2P,
      isInbound,
      isOutbound,
      isStarted,
      isStopped,
      isBlocked,
      isDestinationAResource,
      sourceName,
      destinationName,
      type,
    };
  }, [event, t]);

  const aggregatedMessage = () => {
    const { starts, ends, drops } = getTrafficEventCounts(event);
    const connections = (n: number) =>
      t("trafficEvents.countPluralOneConnectionOtherConnections", { count: n });

    const joinClauses = (clauses: string[]) =>
      clauses.map((clause, index) => (
        <React.Fragment key={clause}>
          {index > 0 &&
            (index === clauses.length - 1 ? t("trafficEvents.and") : ", ")}
          {clause}
        </React.Fragment>
      ));

    const startVerb = info.isInbound
      ? t("trafficEvents.accepted")
      : t("trafficEvents.started");
    const initiated = [
      starts > 0 && `${startVerb} ${connections(starts)}`,
      ends > 0 &&
        t("trafficEvents.endedConnections", { connections: connections(ends) }),
    ].filter(Boolean) as string[];

    const sentences: React.ReactNode[] = [];
    if (initiated.length > 0) {
      sentences.push(
        info.isInbound ? (
          <>
            {info.destinationName} {joinClauses(initiated)}
            {" " + t("trafficEvents.from")} {info.sourceName}
          </>
        ) : (
          <>
            {t.rich("trafficEvents.to", {
              part0: () => info.sourceName,
              part1: () => joinClauses(initiated),
              part2: () => info.destinationName,
            })}
          </>
        ),
      );
    }
    if (drops > 0) {
      sentences.push(
        <>
          {t.rich("trafficEvents.gotBlockedTryingToConnectTo", {
            part0: () => info.sourceName,
            part1: () => drops.toLocaleString(),
            part2: () =>
              drops === 1 ? t("trafficEvents.time") : t("trafficEvents.times"),
            part3: () => info.destinationName,
          })}
        </>,
      );
    }

    return (
      <>
        {sentences.map((sentence, index) => (
          <React.Fragment key={index}>
            {index > 0 && ". "}
            {sentence}
          </React.Fragment>
        ))}
      </>
    );
  };

  const getMessage = () => {
    if (isAggregated) return aggregatedMessage();

    /**
     * Connection between a peer and a resource
     */
    if (
      info.isP2P &&
      info.isOutbound &&
      info.isStarted &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.requestedConnectionTo", {
            part0: () => info.sourceName,
            part1: () => info.destinationName,
          })}
        </>
      );
    }

    if (
      info.isP2P &&
      info.isOutbound &&
      info.isStopped &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.stoppedConnectionTo", {
            part0: () => info.sourceName,
            part1: () => info.destinationName,
          })}
        </>
      );
    }

    /**
     * With routing peers
     */
    if (
      !info.isP2P &&
      info.isInbound &&
      info.isStarted &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.receivedConnectionTo", {
            part0: () => t("common.routingPeer") + " ",
            part1: () => routerName,
            part2: () => info.destinationName,
            part3: () => " " + t("trafficEvents.from") + " ",
            part4: () => info.sourceName,
          })}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isOutbound &&
      info.isStarted &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.startedRoutingTo", {
            part0: () => t("common.routingPeer") + " ",
            part1: () => routerName,
            part2: () => info.destinationName,
            part3: () => t("trafficEvents.from") + " ",
            part4: () => info.sourceName,
          })}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isOutbound &&
      info.isStopped &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.stoppedRoutingTo", {
            part0: () => t("common.routingPeer") + " ",
            part1: () => routerName,
            part2: () => info.destinationName,
            part3: () => t("trafficEvents.from") + " ",
            part4: () => info.sourceName,
          })}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isInbound &&
      info.isStopped &&
      info.isDestinationAResource
    ) {
      return (
        <>
          {t.rich("trafficEvents.stoppedConnectionTo2", {
            part0: () => t("common.routingPeer") + " ",
            part1: () => routerName,
            part2: () => info.destinationName,
            part3: () => t("trafficEvents.from") + " ",
            part4: () => info.sourceName,
          })}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isDestinationAResource &&
      info.isBlocked &&
      info.isOutbound
    ) {
      return (
        <>
          {t.rich("trafficEvents.connectionToWasBlocked", {
            part0: () => info.destinationName,
          })}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isDestinationAResource &&
      info.isBlocked &&
      info.isInbound
    ) {
      return (
        <>
          {t.rich("trafficEvents.blockedConnectionTo", {
            part0: () => t("common.routingPeer") + " ",
            part1: () => routerName,
            part2: () => info.destinationName,
          })}
        </>
      );
    }

    /**
     * P2P connection between two peers
     */
    if (info.isP2P && info.isOutbound && info.isStarted) {
      return (
        <>
          {t.rich("trafficEvents.requestedP2PConnectionTo", {
            part0: () => info.sourceName,
            part1: () => info.destinationName,
          })}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isStarted) {
      return (
        <>
          {t.rich("trafficEvents.receivedP2PConnectionFrom", {
            part0: () => info.destinationName,
            part1: () => info.sourceName,
          })}
        </>
      );
    }

    if (info.isP2P && info.isOutbound && info.isStopped) {
      return (
        <>
          {t.rich("trafficEvents.stoppedP2PConnectionTo", {
            part0: () => info.sourceName,
            part1: () => info.destinationName,
          })}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isStopped) {
      return (
        <>
          {t.rich("trafficEvents.stoppedP2PConnectionFrom", {
            part0: () => info.destinationName,
            part1: () => info.sourceName,
          })}
        </>
      );
    }

    if (info.isP2P && info.isOutbound && info.isBlocked) {
      return (
        <>
          {t.rich("trafficEvents.blockedP2PConnectionTo", {
            part0: () => info.sourceName,
            part1: () => info.destinationName,
          })}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isBlocked) {
      return (
        <>
          {t.rich("trafficEvents.blockedP2PConnectionFrom", {
            part0: () => info.destinationName,
            part1: () => info.sourceName,
          })}
        </>
      );
    }

    // Fallback to generic message
    return (
      <>{getTrafficEventTypeText(info.type, info.isP2P, event.direction, t)}</>
    );
  };

  return (
    <div>
      <div className={"flex items-center mb-1.5 gap-2"}>
        <span className={"text-xs text-nb-gray-300 block"}>
          {isAggregated && eventWindow ? (
            <span>
              {locale === defaultLocale
                ? eventWindow.first.format("MMM D, YYYY [at] h:mm A")
                : new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(eventWindow.first.toDate())}{" "}
              &ndash;{" "}
              {locale === defaultLocale
                ? eventWindow.last.format(
                    eventWindow.first.isSame(eventWindow.last, "day")
                      ? "h:mm A"
                      : "MMM D, h:mm A",
                  )
                : new Intl.DateTimeFormat(locale, {
                    ...(eventWindow.first.isSame(eventWindow.last, "day")
                      ? {}
                      : { month: "short" as const, day: "numeric" as const }),
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(eventWindow.last.toDate())}
            </span>
          ) : (
            <span>
              {locale === defaultLocale ? dayjs(timestamp).format("MMM D, YYYY [at] h:mm:ss A") : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(dayjs(timestamp).toDate())}
            </span>
          )}
        </span>
      </div>
      <div
        className={cn(
          "text-nb-gray-250 text-sm min-w-[22rem] max-w-[23rem] font-light",
        )}
      >
        {getMessage()}
        {showCaret && (
          <div
            className={cn(
              "inline ml-2 text-xs text-nb-gray-300 -top-[1px] relative",
              "group-hover/accordion:text-nb-gray-200 transition-all",
            )}
          >
            <ChevronDownIcon
              size={18}
              className={
                "group-data-[accordion=opened]/accordion:hidden shrink-0 inline"
              }
            />
            <ChevronUpIcon
              size={18}
              className={
                "group-data-[accordion=closed]/accordion:hidden shrink-0 inline"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Mark = ({ children }: { children: React.ReactNode }) => {
  return <span className={"text-white font-normal"}>{children}</span>;
};

import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import {
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventMachine,
  TrafficEventMachineType,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { getTrafficEventTypeText } from "@/cloud/traffic-events/TrafficEventsTable";
import { stripZeroPort } from "@/cloud/traffic-events/utils/parseAddress";
import { usePeers } from "@/contexts/PeersProvider";

type Props = {
  event: TrafficEvent;
  type: TrafficEventType;
  showCaret?: boolean;
};

const isResource = (m: TrafficEventMachine) => {
  return m.type !== TrafficEventMachineType.PEER;
};

const getNamePrefix = (m: TrafficEventMachine) => {
  switch (m.type) {
    case TrafficEventMachineType.PEER:
      return "Peer ";
    case TrafficEventMachineType.ROUTE:
      return "Route ";
    case TrafficEventMachineType.UNKNOWN:
      return "";
    default:
      return "Resource ";
  }
};

export const TrafficEventDescription = ({
  event,
  type,
  showCaret = false,
}: Props) => {
  const { peers } = usePeers();

  const routerName = useMemo(() => {
    const reporter = peers?.find((peer) => peer.id === event.reporter_id);
    return reporter ? <Mark>{reporter.name}</Mark> : <Mark>Unknown</Mark>;
  }, [event.reporter_id, peers]);

  const timestamp = event.events?.find((e) => e.type === type)?.timestamp;

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
        {getNamePrefix(event.source)}
        <Mark>{event.source.name || sourceAddress}</Mark>
      </>
    );
    const destinationName = (
      <>
        {getNamePrefix(event.destination)}
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
  }, [event]);

  const getMessage = () => {
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
          {info.sourceName} requested connection to {info.destinationName}
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
          {info.sourceName} stopped connection to {info.destinationName}
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
          Routing peer {routerName} received connection to{" "}
          {info.destinationName} from {info.sourceName}
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
          Routing peer {routerName} started routing to {info.destinationName}{" "}
          from {info.sourceName}
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
          Routing peer {routerName} stopped routing to {info.destinationName}{" "}
          from {info.sourceName}
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
          Routing peer {routerName} stopped connection to {info.destinationName}{" "}
          from {info.sourceName}
        </>
      );
    }

    if (
      !info.isP2P &&
      info.isDestinationAResource &&
      info.isBlocked &&
      info.isOutbound
    ) {
      return <>Connection to {info.destinationName} was blocked</>;
    }

    if (
      !info.isP2P &&
      info.isDestinationAResource &&
      info.isBlocked &&
      info.isInbound
    ) {
      return (
        <>
          Routing peer {routerName} blocked connection to {info.destinationName}
        </>
      );
    }

    /**
     * P2P connection between two peers
     */
    if (info.isP2P && info.isOutbound && info.isStarted) {
      return (
        <>
          {info.sourceName} requested P2P connection to {info.destinationName}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isStarted) {
      return (
        <>
          {info.destinationName} received P2P connection from {info.sourceName}
        </>
      );
    }

    if (info.isP2P && info.isOutbound && info.isStopped) {
      return (
        <>
          {info.sourceName} stopped P2P connection to {info.destinationName}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isStopped) {
      return (
        <>
          {info.destinationName} stopped P2P connection from {info.sourceName}
        </>
      );
    }

    if (info.isP2P && info.isOutbound && info.isBlocked) {
      return (
        <>
          {info.sourceName} blocked P2P connection to {info.destinationName}
        </>
      );
    }

    if (info.isP2P && info.isInbound && info.isBlocked) {
      return (
        <>
          {info.destinationName} blocked P2P connection from {info.sourceName}
        </>
      );
    }

    // Fallback to generic message
    return (
      <>{getTrafficEventTypeText(info.type, info.isP2P, event.direction)}</>
    );
  };

  return (
    <div>
      <div className={"flex items-center mb-1.5 gap-2"}>
        <span className={"text-xs text-nb-gray-300 block"}>
          <span>{dayjs(timestamp).format("MMM D, YYYY [at] h:mm:ss A")}</span>
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

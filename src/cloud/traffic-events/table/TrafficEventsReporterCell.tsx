import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import * as React from "react";
import { TrafficEvent } from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { usePeers } from "@/contexts/PeersProvider";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: TrafficEvent;
};

export const TrafficEventsReporterCell = ({ event }: Props) => {
  const { peers } = usePeers();
  const router = useRouter();

  const isP2P =
    event.source.id === event.reporter_id ||
    event.destination.id === event.reporter_id;

  if (isP2P)
    return (
      <div title={event.reporter_id}>
        <EmptyRow />
      </div>
    );

  const reporter = peers?.find((peer) => peer.id === event.reporter_id);
  if (!reporter)
    return (
      <div title={event.reporter_id}>
        <EmptyRow />
      </div>
    );

  return (
    <div>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 text-nb-gray-300 text-left py-[0.35rem] pl-2 pr-3 rounded-md group/machine",
          "hover:bg-nb-gray-920 cursor-pointer",
        )}
        onClick={() => router.push("/peer?id=" + reporter.id)}
      >
        <ActiveInactiveRow active={reporter.connected} text={reporter.name}>
          <div className={"text-nb-gray-400 font-light truncate"}>
            {event?.user.email}
          </div>
        </ActiveInactiveRow>
      </div>
    </div>
  );
};

import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import { isL4Event, ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import Badge from "@components/Badge";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsStatusCell = ({ event }: Props) => {
  if (isL4Event(event)) return <EmptyRow />;
  const isSuccess = event.status_code >= 200 && event.status_code < 400;
  const reason = event.reason?.trim();

  const badge = (
    <Badge variant={isSuccess ? "green" : "red"} className={"w-[50px]"}>
      {event.status_code}
    </Badge>
  );

  if (!reason) return badge;

  return (
    <FullTooltip
      interactive={false}
      content={
        <div className={"max-w-xs text-xs break-words whitespace-normal"}>
          <span className={"text-nb-gray-400"}>Reason: </span>
          <span className={"text-nb-gray-100"}>{reason}</span>
        </div>
      }
    >
      <div className={"cursor-help w-fit"}>{badge}</div>
    </FullTooltip>
  );
};

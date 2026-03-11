import * as React from "react";
import { isL4Event, ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import Badge from "@components/Badge";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsStatusCell = ({ event }: Props) => {
  if (isL4Event(event)) {
    return (
      <span className="text-nb-gray-200 text-xs px-1">-</span>
    );
  }

  const isSuccess = event.status_code >= 200 && event.status_code < 400;

  return (
    <Badge variant={isSuccess ? "green" : "red"} className={"w-[50px]"}>
      {event.status_code}
    </Badge>
  );
};

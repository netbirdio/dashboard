import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import Badge from "@components/Badge";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsStatusCell = ({ event }: Props) => {
  const isSuccess = event.status_code >= 200 && event.status_code < 400;

  return (
    <Badge variant={isSuccess ? "green" : "red"} className={"w-[50px]"}>
      {event.status_code}
    </Badge>
  );
};

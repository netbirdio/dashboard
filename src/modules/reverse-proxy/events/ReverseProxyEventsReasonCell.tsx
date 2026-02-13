import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsReasonCell = ({ event }: Props) => {
  return (
    <span className="text-nb-gray-300 text-[0.82rem] py-2 text-left">
      {event.reason || "-"}
    </span>
  );
};

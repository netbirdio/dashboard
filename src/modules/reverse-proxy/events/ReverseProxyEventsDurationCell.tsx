import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsDurationCell = ({ event }: Props) => {
  return (
    <span className="text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono">
      {event.duration_ms}ms
    </span>
  );
};

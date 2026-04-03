import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import { formatDuration } from "@utils/helpers";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsDurationCell = ({ event }: Props) => {
  return (
    <span className="text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono">
      {formatDuration(event.duration_ms)}
    </span>
  );
};

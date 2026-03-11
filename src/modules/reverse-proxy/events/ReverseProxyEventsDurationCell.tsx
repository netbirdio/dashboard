import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export const ReverseProxyEventsDurationCell = ({ event }: Props) => {
  return (
    <span className="text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono">
      {formatDuration(event.duration_ms)}
    </span>
  );
};

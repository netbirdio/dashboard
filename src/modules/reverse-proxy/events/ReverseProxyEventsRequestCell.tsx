import CopyToClipboardText from "@components/CopyToClipboardText";
import TruncatedText from "@components/ui/TruncatedText";
import * as React from "react";
import {
  isL4Event,
  ReverseProxy,
  ReverseProxyEvent,
} from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
  service?: ReverseProxy;
};

export const ReverseProxyEventsMethodCell = ({ event }: Props) => {
  if (isL4Event(event)) {
    return (
      <span className="font-mono text-[0.82rem] font-medium py-2 text-nb-gray-200 uppercase">
        {event.protocol}
      </span>
    );
  }

  return (
    <span className="font-mono text-[0.82rem] font-medium py-2 text-nb-gray-300">
      {event.method}
    </span>
  );
};

export const ReverseProxyEventsUrlCell = ({ event, service }: Props) => {
  const isL4 = isL4Event(event);
  const listenPort = service?.listen_port;

  const hostWithPort =
    isL4 && listenPort ? `${event.host}:${listenPort}` : event.host || "-";
  const fullUrl = isL4 ? hostWithPort : `${event.host}${event.path}`;

  return (
    <TruncatedText
      text={fullUrl}
      maxWidth="360px"
      className={"text-nb-gray-300"}
      side={"top"}
      sideOffset={10}
      tooltipContent={
        <div className="max-w-sm break-all whitespace-normal text-xs text-neutral-300">
          {fullUrl}
        </div>
      }
    >
      <CopyToClipboardText message={"URL has been copied to your clipboard"}>
        <span className="font-mono text-[0.82rem] whitespace-nowrap">
          <span className="text-nb-gray-200">{event.host}</span>
          {isL4 && listenPort && (
            <span className="text-nb-gray-300">:{listenPort}</span>
          )}
          {!isL4 && (
            <span className="text-nb-gray-300">{event.path}</span>
          )}
        </span>
      </CopyToClipboardText>
    </TruncatedText>
  );
};

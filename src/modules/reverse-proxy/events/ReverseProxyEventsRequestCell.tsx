import CopyToClipboardText from "@components/CopyToClipboardText";
import TruncatedText from "@components/ui/TruncatedText";
import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsMethodCell = ({ event }: Props) => {
  return (
    <span className="font-mono text-[0.82rem] font-medium py-2 text-nb-gray-300">
      {event.method}
    </span>
  );
};

export const ReverseProxyEventsUrlCell = ({ event }: Props) => {
  const fullUrl = `${event.host}${event.path}`;

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
          <span className="text-nb-gray-300">{event.path}</span>
        </span>
      </CopyToClipboardText>
    </TruncatedText>
  );
};

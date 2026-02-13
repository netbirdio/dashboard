import CopyToClipboardText from "@components/CopyToClipboardText";
import { cn } from "@utils/helpers";
import * as React from "react";
import { ReverseProxyTarget } from "@/interfaces/ReverseProxy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  target: ReverseProxyTarget;
};

export default function ReverseProxyDestinationCell({
  target,
}: Readonly<Props>) {
  if (!target.destination || target.destination === "unknown")
    return <EmptyRow />;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-neutral-300 font-light truncate",
        !target.enabled && "opacity-30",
      )}
    >
      <CopyToClipboardText>
        <span className={"font-normal truncate font-mono text-[0.82rem]"}>
          {target.destination}
        </span>
      </CopyToClipboardText>
    </div>
  );
}

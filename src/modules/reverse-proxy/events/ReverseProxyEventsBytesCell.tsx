import { cn, formatBytes } from "@utils/helpers";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsBytesCell = ({ event }: Props) => {
  if (
    (event.bytes_download === undefined || event.bytes_download === 0) &&
    (event.bytes_upload === undefined || event.bytes_upload === 0)
  )
    return <EmptyRow />;

  return (
    <div className={"flex flex-col text-xs gap-1 text-nb-gray-300 font-medium"}>
      <div className={"flex gap-2 items-center whitespace-nowrap"}>
        <ArrowDownIcon size={15} className={cn("text-sky-400")} />
        <span className="sr-only">Download:</span>
        {formatBytes(event.bytes_download ?? 0)}
      </div>
      <div className={"flex gap-2 items-center whitespace-nowrap"}>
        <ArrowUpIcon size={15} className={cn("text-netbird")} />
        <span className="sr-only">Upload:</span>
        {formatBytes(event.bytes_upload ?? 0)}
      </div>
    </div>
  );
};

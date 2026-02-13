import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import * as React from "react";

type Props = {
  timestamp: string;
  className?: string;
};

export const ReverseProxyEventsTimeCell = ({ timestamp, className }: Props) => {
  return (
    <div
      className={cn(
        "w-full flex flex-col gap-1 min-w-[120px] max-w-[120px]",
        className,
      )}
    >
      <div>
        <div
          className={cn(
            "flex-col flex whitespace-nowrap",
            "dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 py-2 px-3 rounded-md cursor-default",
          )}
        >
          <span className={"text-nb-gray-200 flex gap-2 items-center"}>
            {dayjs(timestamp).format("MMM D, YYYY")}
          </span>
          <span className={"text-nb-gray-400"}>
            {dayjs(timestamp).format("h:mm:ss A")}
          </span>
        </div>
      </div>
    </div>
  );
};

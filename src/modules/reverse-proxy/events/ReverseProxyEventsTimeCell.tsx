import { cn } from "@utils/helpers";
import * as React from "react";
import { formatDateTooltip } from "@/i18n/date-time";
import { useDashboardLocale } from "@/i18n/LocaleProvider";

type Props = {
  timestamp: string;
  className?: string;
};

export const ReverseProxyEventsTimeCell = ({ timestamp, className }: Props) => {
  const { locale } = useDashboardLocale();
  const date = new Date(timestamp);
  return (
    <div
      title={formatDateTooltip(date, locale)}
      className={cn(
        "w-full flex flex-col gap-1 min-w-[120px] max-w-[120px]",
        className,
      )}
    >
      <div>
        <div
          className={cn(
            "flex-col flex whitespace-nowrap",
            "text-nb-gray-300 dark:text-neutral-300 hover:text-nb-gray-100 dark:hover:text-neutral-100 py-2 px-3 rounded-md cursor-default",
          )}
        >
          <span className={"text-nb-gray-200 flex gap-2 items-center"}>
            {new Intl.DateTimeFormat(locale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(date)}
          </span>
          <span className={"text-nb-gray-400"}>
            {new Intl.DateTimeFormat(locale, {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: locale === "en",
            }).format(date)}
          </span>
        </div>
      </div>
    </div>
  );
};

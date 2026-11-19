import { defaultLocale } from "@/i18n/locales";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { ClockIcon } from "lucide-react";
import * as React from "react";
import { useTranslations, useDashboardLocale } from "@/i18n/LocaleProvider";

type Props = {
  timestamp: string;
  className?: string;
};

export const TrafficEventsTimeCell = ({ timestamp, className }: Props) => {
  const { locale } = useDashboardLocale();

  const t = useTranslations();

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
            {dayjs(timestamp).format(t("trafficEvents.mMMDYYYY"))}
          </span>
          <span className={"text-nb-gray-400"}>
            {dayjs(timestamp).format(t("trafficEvents.hMmSsA"))}
          </span>
        </div>
      </div>
    </div>
  );
};

const Duration = ({ duration }: { duration: number }) => {
  const t = useTranslations();

  return (
    <div className={"flex items-center gap-2"}>
      <ClockIcon size={14} />
      <span className={"text-nb-gray-300"}>
        {t("trafficEvents.text13m17s")}
      </span>
    </div>
  );
};

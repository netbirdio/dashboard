import { ClockIcon } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { DNSRecord } from "@/interfaces/DNS";

type Props = {
  record: DNSRecord;
};

export const DNSRecordTimeToLiveCell = ({ record }: Props) => {
  const { t } = useI18n();

  const getTTLLabel = (seconds: number) => {
    if (seconds < 60) return t("zones.time.sec", { count: seconds });
    if (seconds < 3600) {
      const minutes = seconds / 60;
      return minutes === 1
        ? t("zones.time.min.one")
        : t("zones.time.min.other", { count: minutes });
    }
    if (seconds < 86400) {
      const hours = seconds / 3600;
      return hours === 1
        ? t("zones.time.hour.one")
        : t("zones.time.hour.other", { count: hours });
    }
    const days = seconds / 86400;
    return days === 1
      ? t("zones.time.day.one")
      : t("zones.time.day.other", { count: days });
  };

  return (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all py-2 px-3 rounded-md"
      }
    >
      <ClockIcon size={14} />
      {getTTLLabel(record.ttl)}
    </div>
  );
};

"use client";

import Button from "@components/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { AbsoluteDateTimeInput } from "@components/ui/AbsoluteDateTimeInput";
import { Calendar } from "@components/ui/Calendar";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { debounce } from "lodash";
import { Calendar as CalendarIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
}

const defaultRanges = {
  last5Minutes: {
    from: dayjs().subtract(5, "minute").toDate(),
    to: dayjs().toDate(),
  },
  last15Minutes: {
    from: dayjs().subtract(15, "minute").toDate(),
    to: dayjs().toDate(),
  },
  last30Minutes: {
    from: dayjs().subtract(30, "minute").toDate(),
    to: dayjs().toDate(),
  },
  last1Hour: {
    from: dayjs().subtract(1, "hour").toDate(),
    to: dayjs().toDate(),
  },
  today: {
    from: dayjs().startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
  yesterday: {
    from: dayjs().subtract(1, "day").startOf("day").toDate(),
    to: dayjs().subtract(1, "day").endOf("day").toDate(),
  },
  last14Days: {
    from: dayjs().subtract(14, "day").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
  last2Days: {
    from: dayjs().subtract(2, "day").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
  last7Days: {
    from: dayjs().subtract(7, "day").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
  lastMonth: {
    from: dayjs().subtract(1, "month").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
  allTime: {
    from: dayjs("1970-01-01").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  },
};

const isEqualDateRange = (a: DateRange | undefined, b: DateRange) => {
  if (!a || !a.from) return false;
  // 对于短时间范围，精确到分钟比较
  const aFrom = dayjs(a.from);
  const aTo = a.to ? dayjs(a.to) : aFrom;
  const bFrom = dayjs(b.from);
  const bTo = b.to ? dayjs(b.to) : bFrom;
  return (
    Math.abs(aFrom.diff(bFrom, "minute")) < 1 &&
    Math.abs(aTo.diff(bTo, "minute")) < 1
  );
};

export function DatePickerWithRange({
  className,
  value,
  onChange,
  disabled = false,
}: Readonly<Props>) {
  const { t } = useI18n();
  const isActive = useMemo(() => {
    return {
      last5Minutes: isEqualDateRange(value, defaultRanges.last5Minutes),
      last15Minutes: isEqualDateRange(value, defaultRanges.last15Minutes),
      last30Minutes: isEqualDateRange(value, defaultRanges.last30Minutes),
      last1Hour: isEqualDateRange(value, defaultRanges.last1Hour),
      today: isEqualDateRange(value, defaultRanges.today),
      yesterday: isEqualDateRange(value, defaultRanges.yesterday),
      last14Days: isEqualDateRange(value, defaultRanges.last14Days),
      last2Days: isEqualDateRange(value, defaultRanges.last2Days),
      last7Days: isEqualDateRange(value, defaultRanges.last7Days),
      lastMonth: isEqualDateRange(value, defaultRanges.lastMonth),
      allTime: isEqualDateRange(value, defaultRanges.allTime),
    };
  }, [value]);

  const displayDateValue = useMemo(() => {
    if (!value) return t("datePicker.selectDateRange");

    if (isActive.allTime) return t("datePicker.allTime");
    if (isActive.lastMonth) return t("datePicker.lastMonth");
    if (isActive.last14Days) return t("datePicker.last14Days");
    if (isActive.last2Days) return t("datePicker.last2Days");
    if (isActive.last7Days) return t("datePicker.last7Days");
    if (isActive.yesterday) return t("datePicker.yesterday");
    if (isActive.today) return t("datePicker.today");
    if (isActive.last1Hour) return t("datePicker.last1Hour");
    if (isActive.last30Minutes) return t("datePicker.last30Minutes");
    if (isActive.last15Minutes) return t("datePicker.last15Minutes");
    if (isActive.last5Minutes) return t("datePicker.last5Minutes");

    if (!value.to) return dayjs(value.from).format("MMM DD, HH:mm").toString();
    return `${dayjs(value.from).format("MMM DD, HH:mm")} - ${dayjs(
      value.to,
    ).format("MMM DD, HH:mm")}`;
  }, [value, isActive, t]);

  const [calendarOpen, setCalendarOpen] = useState(false);

  const updateRangeAndClose = (range: DateRange) => {
    onChange?.(range);
  };

  const debouncedOnChange = useMemo(() => {
    return onChange ? debounce(onChange, 500) : undefined;
  }, [onChange]);

  const handleOnSelect = (range?: DateRange) => {
    let from = range?.from
      ? dayjs(range.from).startOf("day").toDate()
      : undefined;
    let to = range?.to ? dayjs(range.to).endOf("day").toDate() : undefined;
    if (!from && !to) {
      onChange?.(undefined);
      return;
    }
    onChange?.({ from, to });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"secondary"}
            disabled={disabled}
            className={cn("max-w-[260px] justify-start text-left font-normal")}
          >
            <CalendarIcon size={16} className={"shrink-0"} />
            {displayDateValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          side={"right"}
          sideOffset={10}
          alignOffset={-100}
        >
          <div
            className={
              "px-3 py-2 flex flex-wrap gap-2 max-w-[280px] sm:max-w-none border-b border-nb-gray-800 items-center justify-between w-full"
            }
          >
            <div className="flex gap-2 flex-wrap">
              <CalendarButton
                label={t("datePicker.last5Minutes")}
                active={isActive.last5Minutes}
                onClick={() => updateRangeAndClose(defaultRanges.last5Minutes)}
              />
              <CalendarButton
                label={t("datePicker.last15Minutes")}
                active={isActive.last15Minutes}
                onClick={() => updateRangeAndClose(defaultRanges.last15Minutes)}
              />
              <CalendarButton
                label={t("datePicker.last30Minutes")}
                active={isActive.last30Minutes}
                onClick={() => updateRangeAndClose(defaultRanges.last30Minutes)}
              />
              <CalendarButton
                label={t("datePicker.last1Hour")}
                active={isActive.last1Hour}
                onClick={() => updateRangeAndClose(defaultRanges.last1Hour)}
              />
            </div>
            <div className={"flex gap-2 flex-wrap"}>
              <CalendarButton
                label={t("datePicker.today")}
                active={isActive.today}
                onClick={() => updateRangeAndClose(defaultRanges.today)}
              />
              <CalendarButton
                label={t("datePicker.yesterday")}
                active={isActive.yesterday}
                onClick={() => updateRangeAndClose(defaultRanges.yesterday)}
              />
              <CalendarButton
                label={t("datePicker.last7Days")}
                active={isActive.last7Days}
                onClick={() => updateRangeAndClose(defaultRanges.last7Days)}
              />
              <CalendarButton
                label={
                  <>
                    <CalendarIcon size={14} className={"shrink-0"} />
                    {t("datePicker.allTime")}
                  </>
                }
                active={isActive.allTime}
                onClick={() => updateRangeAndClose(defaultRanges.allTime)}
              />
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={handleOnSelect}
            numberOfMonths={2}
          />
          <AbsoluteDateTimeInput value={value} onChange={debouncedOnChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

type CalendarButtonProps = {
  label: string | React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

function CalendarButton({
  label,
  onClick,
  active,
}: Readonly<CalendarButtonProps>) {
  return (
    <button
      className={cn(
        "py-1.5 leading-none px-2.5 rounded-md text-center text-xs transition-all flex gap-2",
        active
          ? "bg-nb-gray-800 text-white"
          : "bg-transparent text-nb-gray-300 hover:bg-nb-gray-900 hover:text-nb-gray-100",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

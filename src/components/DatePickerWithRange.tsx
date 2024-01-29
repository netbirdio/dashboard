"use client";

import Button from "@components/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { Calendar } from "@components/ui/Calendar";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { Calendar as CalendarIcon } from "lucide-react";
import React from "react";
import { DateRange } from "react-day-picker";

interface Props {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({ className, value, onChange }: Props) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"secondary"}
            className={cn("w-[260px] justify-start text-left font-normal")}
          >
            <CalendarIcon size={16} />
            {value?.from ? (
              value.to ? (
                <>
                  {dayjs(value.from).format("MMM DD, YYYY")} -{" "}
                  {dayjs(value.to).format("MMM DD, YYYY")}
                </>
              ) : (
                <>{dayjs(value.from, "LLL dd, y").toString()}</>
              )
            ) : (
              <span>Pick your date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={10}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

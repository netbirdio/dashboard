import { useMemo } from "react";

export type TimeUnit = "seconds" | "minutes" | "hours" | "days";
export type TimeRange = TimeUnit[];

const TIME_CONVERSIONS: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

interface FormattedTime {
  value: string;
  time: TimeUnit | string;
}

export const isValidTimeUnit = (unit: string): unit is TimeUnit => {
  return unit in TIME_CONVERSIONS;
};

export const convertToSeconds = (
  value: string,
  unit: TimeUnit | string,
): number => {
  if (!isValidTimeUnit(unit)) {
    console.warn(`Invalid time unit: ${unit}`);
  }
  return Math.round(parseFloat(value) * TIME_CONVERSIONS[unit]);
};

export const useTimeFormatter = (
  seconds: number,
  range: TimeRange,
): FormattedTime => {
  return useMemo(() => {
    const smallerUnit = range[0];
    const largestUnit = range[range.length - 1];
    const largestIndex = range.indexOf(largestUnit);

    if (TIME_CONVERSIONS[smallerUnit] >= TIME_CONVERSIONS[largestUnit]) {
      console.warn("First unit must be smaller than second unit");
    }

    if (seconds === TIME_CONVERSIONS.days && largestUnit === "days") {
      return { value: "24", time: "hours" };
    }

    // Convert seconds to all units in range
    const converted = range.map((unit) => {
      const value = seconds / TIME_CONVERSIONS[unit];
      return {
        value: Number.isInteger(value) ? value.toString() : value.toFixed(2),
        time: unit,
      };
    });

    const { value, time } =
      converted.reverse().find(({ value }) => parseFloat(value) >= 1) ||
      converted[largestIndex];
    return { value, time };
  }, [seconds, range]);
};

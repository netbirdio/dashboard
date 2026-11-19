import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { defaultLocale, type Locale } from "./locales";

dayjs.extend(relativeTime);

export function formatRelativeDate(
  date: Date,
  locale: Locale,
  now = new Date(),
): string {
  const instant = dayjs(date);
  const reference = dayjs(now);
  if (locale === defaultLocale) return reference.to(instant);

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const unit of ["year", "month", "day", "hour", "minute"] as const) {
    const difference = instant.diff(reference, unit);
    if (difference) return formatter.format(difference, unit);
  }
  return formatter.format(instant.diff(reference, "second"), "second");
}

export function formatDateTooltip(date: Date, locale: Locale): string {
  if (locale === defaultLocale) {
    return dayjs(date).format("D MMMM, YYYY [at] h:mm A");
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

import dayjs from "dayjs";
import { Calendar } from "lucide-react";
import { useDashboardLocale } from "@/i18n/LocaleProvider";
import { defaultLocale } from "@/i18n/locales";

type Props = {
  date: Date;
};
export default function ExpirationDateRow({ date }: Props) {
  const { locale } = useDashboardLocale();
  return (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 text-nb-gray-300 dark:text-neutral-300 transition-all  py-2 px-3 rounded-md"
      }
    >
      <Calendar size={14} />
      {locale === defaultLocale
        ? dayjs(date).format("D MMM YYYY")
        : new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(date)}
    </div>
  );
}

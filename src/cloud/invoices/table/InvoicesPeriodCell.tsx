import { defaultLocale } from "@/i18n/locales";
import { useDashboardLocale } from "@/i18n/LocaleProvider";
import dayjs from "dayjs";
import { ReceiptTextIcon } from "lucide-react";
import React from "react";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";

type Props = {
  invoice: Invoice;
};

export default function InvoicesPeriodCell({ invoice }: Readonly<Props>) {
  const { locale } = useDashboardLocale();

  const { period_end } = invoice;
  const end =
    period_end &&
    (locale === defaultLocale
      ? dayjs(period_end).format("MMM DD, YYYY")
      : new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }).format(new Date(period_end)));

  return (
    <div className={"flex items-center text-sm text-nb-gray-200 gap-2"}>
      <ReceiptTextIcon size={14} />
      {`${end}`}
    </div>
  );
}

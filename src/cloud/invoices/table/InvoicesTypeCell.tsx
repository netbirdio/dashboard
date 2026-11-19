import { UserIcon, UsersIcon } from "lucide-react";
import React from "react";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  invoice: Invoice;
};

export default function InvoicesTypeCell({ invoice }: Readonly<Props>) {
  const t = useTranslations();
  const { isActive: isDistributor } = useDistributor();
  const { type } = invoice;
  return (
    <div className={"flex items-center text-sm text-nb-gray-300 gap-2 mr-auto"}>
      {type == "account" ? (
        <>
          <UserIcon size={14} />
          {t("common.account")}
        </>
      ) : (
        <>
          <UsersIcon size={14} />
          {isDistributor ? t("invoices.customers") : t("common.tenants")}
        </>
      )}
    </div>
  );
}

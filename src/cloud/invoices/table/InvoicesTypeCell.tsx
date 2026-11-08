import { useTranslations } from "next-intl";
import { UserIcon, UsersIcon } from "lucide-react";
import React from "react";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";

type Props = {
  invoice: Invoice;
};

export default function InvoicesTypeCell({ invoice }: Readonly<Props>) {
  const t = useTranslations("invoices");
  const { isActive: isDistributor } = useDistributor();
  const { type } = invoice;
  return (
    <div className={"flex items-center text-sm text-nb-gray-300 gap-2 mr-auto"}>
      {type == "account" ? (
        <>
          <UserIcon size={14} />
          {t("account")}
        </>
      ) : (
        <>
          <UsersIcon size={14} />
          {isDistributor ? t("customers") : t("tenants")}
        </>
      )}
    </div>
  );
}

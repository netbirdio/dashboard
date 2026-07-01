import { UserIcon, UsersIcon } from "lucide-react";
import React from "react";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";

type Props = {
  invoice: Invoice;
};

export default function InvoicesTypeCell({ invoice }: Readonly<Props>) {
  const { isActive: isDistributor } = useDistributor();
  const { type } = invoice;
  return (
    <div className={"flex items-center text-sm text-nb-gray-300 gap-2 mr-auto"}>
      {type == "account" ? (
        <>
          <UserIcon size={14} />
          Account
        </>
      ) : (
        <>
          <UsersIcon size={14} />
          {isDistributor ? "Customers" : "Tenants"}
        </>
      )}
    </div>
  );
}

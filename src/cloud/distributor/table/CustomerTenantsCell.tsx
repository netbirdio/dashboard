import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { UsersIcon } from "lucide-react";
import * as React from "react";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  customer: DistributorCustomer;
};

export const CustomerTenantsCell = ({ customer }: Props) => {
  const isActive = customer.status === DistributorCustomerStatus.Active;
  const isInvited = customer.status === DistributorCustomerStatus.Invited;

  if (isInvited || !isActive) return <EmptyRow />;

  return (
    <div className={cn("flex")}>
      <Badge variant={"gray"}>
        <UsersIcon size={14} />
        <div>
          <span className={"font-medium text-xs"}>
            {customer.tenant_number || 0}
          </span>
        </div>
      </Badge>
    </div>
  );
};

import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { useTenantPlan } from "@/cloud/msp/hooks/useTenantPlan";
import { Tenant, TenantStatus } from "@/cloud/msp/interfaces/Tenant";
import { Currency } from "@/interfaces/Plan";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  tenant: Tenant;
};

export const TenantPlanCostCell = ({ tenant }: Props) => {
  const { isLoading, currency, estimatedPrice } = useTenantPlan({
    tenant,
  });

  const isActive = tenant.status === TenantStatus.Active;
  const isInvited = tenant.status === TenantStatus.Invited;
  const isExisting = tenant.status === TenantStatus.Existing;

  if (isLoading) return <Skeleton width={70} height={20} />;
  if (isInvited || isExisting) return <EmptyRow />;

  return (
    <div className={"flex gap-2.5 items-center text-sm text-nb-gray-300"}>
      <span
        className={
          "font-medium text-nb-gray-200/90 tracking-wide whitespace-nowrap"
        }
      >
        {currency == Currency.USD && "$ "}
        {(isActive ? estimatedPrice : 0).toFixed(2)}
        {currency == Currency.EUR && " €"}
      </span>
    </div>
  );
};

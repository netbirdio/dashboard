import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Users2Icon } from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { useTenantPlan } from "@/cloud/msp/hooks/useTenantPlan";
import { Tenant, TenantStatus } from "@/cloud/msp/interfaces/Tenant";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  tenant: Tenant;
};

export const TenantUsersCell = ({ tenant }: Props) => {
  const { stats, isLoading } = useTenantPlan({
    tenant,
  });

  if (isLoading) return <Skeleton width={60} height={32} />;

  const isActive = tenant.status === TenantStatus.Active;
  if (!isActive) return <EmptyRow />;

  return (
    <div className={cn("flex")}>
      <div className={"flex gap-3 items-center text-sm"}>
        <Badge variant={"gray"}>
          <Users2Icon size={14} />
          <div>
            <span className={"font-medium text-xs"}>
              {stats?.active_users || 0}
            </span>
          </div>
        </Badge>
      </div>
    </div>
  );
};

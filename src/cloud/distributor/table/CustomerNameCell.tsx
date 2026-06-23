import { cn, generateColorFromString } from "@utils/helpers";
import { CircleAlertIcon, Clock } from "lucide-react";
import * as React from "react";
import { useCustomerPlan } from "@/cloud/distributor/hooks/useCustomerPlan";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";

type Props = {
  customer: DistributorCustomer;
};

export const CustomerNameCell = ({ customer }: Props) => {
  const { isTrialExpired } = useCustomerPlan({ accountId: customer.id });
  const isActive = customer.status === DistributorCustomerStatus.Active;

  return (
    <div className={cn("flex gap-3 px-2 py-1 items-center")}>
      <div
        className={
          "w-10 h-10 bg-nb-gray-900 border-nb-gray-800 flex items-center shrink-0 rounded-full justify-center text-sm font-medium relative uppercase"
        }
        style={{
          color: generateColorFromString(customer.name),
        }}
      >
        <span>{customer.name.charAt(0)}</span>
        <AvatarBadge isActive={isActive} isTrialExpired={isTrialExpired} />
      </div>
      <div
        className={
          "flex flex-col items-start justify-center text-xs pr-1 pl-1 relative mt-1 whitespace-nowrap"
        }
      >
        <span className={"text-[0.95rem] text-nb-gray-100 font-medium mb-0.5"}>
          {customer.name}
        </span>
        <span className={"text-sm text-nb-gray-400"}>{customer.domain}</span>
      </div>
    </div>
  );
};

type AvatarBadgeProps = {
  isActive: boolean;
  isTrialExpired?: boolean;
};

const AvatarBadge = ({
  isActive,
  isTrialExpired = false,
}: AvatarBadgeProps) => {
  if (!isActive) {
    return (
      <div
        className={cn(
          "w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950",
          "bg-yellow-400 text-yellow-950",
        )}
      >
        <Clock size={12} />
      </div>
    );
  }
  if (isTrialExpired)
    return (
      <div
        className={cn(
          "w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950",
          "bg-yellow-400 text-yellow-950",
        )}
      >
        <CircleAlertIcon size={12} />
      </div>
    );
};

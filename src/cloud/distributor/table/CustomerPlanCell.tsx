import Badge from "@components/Badge";
import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { CircleAlertIcon, CreditCardIcon } from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { useCustomerPlan } from "@/cloud/distributor/hooks/useCustomerPlan";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";
import { useTranslations } from "@/i18n/LocaleProvider";
import { PlanTier } from "@/interfaces/Subscription";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  customer: DistributorCustomer;
  onUpgrade?: () => void;
};

export const CustomerPlanCell = ({ customer, onUpgrade }: Props) => {
  const t = useTranslations();
  const { currentPlanTier, isLoading, trialDaysRemaining, isTrialExpired } =
    useCustomerPlan({ accountId: customer.id });

  const isInvited = customer.status === DistributorCustomerStatus.Invited;
  if (isInvited) return <EmptyRow />;

  if (isLoading || !currentPlanTier)
    return <Skeleton width={100} height={20} />;

  if (isTrialExpired)
    return (
      <div className={"flex gap-3 items-center"}>
        <Badge variant={"yellow"} className={"h-[32px]"}>
          <CircleAlertIcon size={12} />
          {t("common.trialExpired")}
        </Badge>
        {onUpgrade && (
          <Button
            size={"xs"}
            variant={"secondary"}
            className={"h-[32px]"}
            onClick={onUpgrade}
          >
            <CreditCardIcon size={12} />
            {t("common.upgradePlan")}
          </Button>
        )}
      </div>
    );

  const isActive = customer.status === DistributorCustomerStatus.Active;
  if (!isActive) return <EmptyRow />;

  return (
    <div
      className={cn(
        "flex gap-2.5 items-center text-nb-gray-300 text-sm pr-5 whitespace-nowrap",
      )}
    >
      <CurrentPlan plan={currentPlanTier} />
      {currentPlanTier === PlanTier.TRIAL && (
        <RemainingTrialDays days={trialDaysRemaining} />
      )}
    </div>
  );
};

type RemainingTrialDaysProps = {
  days?: number;
};

const RemainingTrialDays = ({ days }: RemainingTrialDaysProps) => {
  const t = useTranslations();

  if (days === undefined) return null;
  if (days === 1) return t("distributor.daysDayLeft", { days });
  if (days === 0) return t("distributor.trialHasExpired");

  return t("distributor.daysDaysLeft", { days });
};

const CurrentPlan = ({ plan }: { plan: PlanTier }) => {
  const t = useTranslations();

  return (
    <>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          plan == PlanTier.BUSINESS && "bg-netbird",
          plan == PlanTier.TEAM && "bg-sky-500",
          plan == PlanTier.FREE && "bg-nb-gray-500",
          plan == PlanTier.TRIAL && "bg-purple-400",
        )}
      ></span>
      {plan == PlanTier.BUSINESS && t("onboarding.business")}
      {plan == PlanTier.TEAM && t("billing.team")}
      {plan == PlanTier.FREE && t("distributor.free")}
      {plan == PlanTier.TRIAL && t("billing.freeTrial")}
    </>
  );
};

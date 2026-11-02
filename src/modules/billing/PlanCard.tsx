import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import dayjs from "dayjs";
import {
  Check,
  HelpCircle,
  Loader2,
  MonitorSmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Currency, Plan } from "@/interfaces/Plan";
import { PlanTier, Subscription } from "@/interfaces/Subscription";
import { PlanIcon } from "@/modules/billing/PlanIcon";

type Props = {
  currentPlan?: Plan;
  currentSubscription?: Subscription;
  plan: Plan;
  currency: Currency;
  isSubscribing: {
    team: boolean;
    business: boolean;
  };
  onClick: (plan: Plan) => void;
  buttonText?: {
    upgrade?: string;
    downgrade?: string;
  };
};

export const PlanCard = ({
  plan,
  currency,
  currentPlan,
  currentSubscription,
  isSubscribing = {
    team: false,
    business: false,
  },
  onClick,
  buttonText = {
    upgrade: "Upgrade to",
    downgrade: "Downgrade to",
  },
}: Props) => {
  // Price of the plan in the selected currency
  const planPrice =
    plan.prices?.find((p) => p.currency == currency)?.price || 0;

  // Price of the current plan in the selected currency
  const currentPlanPrice = currentPlan?.prices?.find(
    (p) => p.currency == currency,
  )?.price;

  const isDowngrade = useMemo(() => {
    if (!planPrice) return false;
    if (!currentPlanPrice) return false;
    return planPrice < currentPlanPrice;
  }, [planPrice, currentPlanPrice]);

  const canUpgrade = useMemo(() => {
    if (currentSubscription && !currentSubscription.active) return true;
    if (currentSubscription && !currentSubscription.updated_at) return true;
    if (currentSubscription && currentSubscription.plan_tier === PlanTier.FREE)
      return true;
    if (currentSubscription && currentSubscription.plan_tier === PlanTier.TRIAL)
      return true;
    const updatedAt = dayjs(currentSubscription?.updated_at);
    const now = dayjs();
    const diff = now.diff(updatedAt, "hour");
    return diff >= 48;
  }, [currentSubscription]);

  const planButtonVariant = (plan: Plan) => {
    if (!canUpgrade) return "input";
    if (plan.name == "Team") return "input";
    if (plan.name === currentPlan?.name) return "input";
    return "primary";
  };

  const planHelpCircle = (plan: Plan) => {
    if (!canUpgrade && plan.name !== currentPlan?.name)
      return <HelpCircle size={13} />;
  };

  const planButtonText = (plan: Plan) => {
    if (plan.name === currentPlan?.name) return "Current Plan";
    if (isDowngrade) return `${buttonText?.downgrade} ${plan.name}`;
    return `${buttonText?.upgrade} ${plan.name}`;
  };

  const planLoadingIcon = () => {
    let isLoading =
      plan.name.toLowerCase() === PlanTier.TEAM
        ? isSubscribing.team
        : isSubscribing.business;
    if (isLoading) {
      return (
        <span className={"flex items-center justify-center animate-spin"}>
          <Loader2 size={14} className={""} />
        </span>
      );
    }
    return null;
  };

  return (
    <div
      key={plan.name}
      className={
        "w-full bg-nb-gray-930/70 border border-nb-gray-900/70 rounded-md max-w-2xl p-5 flex flex-col justify-between"
      }
    >
      <div>
        {/* Plan Name */}
        <div className={"flex items-center text-sm gap-3"}>
          <PlanIcon name={plan.name} />
          <div className={"min-w-0"}>
            <div className={"font-medium text-base flex gap-2 items-center"}>
              {plan.name}
            </div>
            <FullTooltip
              content={
                <div className={"text-xs max-w-xs"}>{plan.description}</div>
              }
              interactive={false}
              className={"min-w-0 flex"}
            >
              <div
                className={
                  "text-nb-gray-400 whitespace-nowrap truncate font-normal hover:text-nb-gray-400/80 transition-all"
                }
              >
                {plan.description}
              </div>
            </FullTooltip>
          </div>
        </div>

        {/* Plan Price */}
        <div className="flex items-center text-white mt-3">
          <p className="text-2xl font-bold">
            {currency == Currency.USD && "$"}
            {planPrice / 100}
            {currency == Currency.EUR && "€"}
          </p>
          <div className="flex flex-col text-sm font-normal ml-2 relative top-0.5 text-nb-gray-300">
            <span>per user / month</span>
          </div>
        </div>

        {/* Plan Users & Machines */}
        <div className={"mt-4 text-sm flex-col gap-1 flex"}>
          <div className={"flex gap-2 items-center text-netbird"}>
            <UsersIcon size={16} />
            <span className={"text-nb-gray-200"}> Unlimited Users</span>
          </div>
          <div className={"flex gap-2 items-center text-netbird"}>
            <MonitorSmartphoneIcon size={16} />
            <span className={"text-nb-gray-200"}>
              {" "}
              100 machines + 10 per user
            </span>
          </div>
        </div>
        {/* Plan Features */}
        {plan?.features && (
          <ul className="flex flex-col gap-1.5 mt-4 mb-5">
            {plan.features?.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-nb-gray-200"
              >
                <Check size={16} className={"text-netbird shrink-0"} />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Plan Button */}
      <FullTooltip
        content={
          <div className={"text-xs max-w-sm"}>
            Your plan was recently updated. Please wait for 48 hours from the
            last update to change your plan again.
          </div>
        }
        disabled={canUpgrade || plan.name === currentPlan?.name}
        interactive={false}
      >
        <Button
          disabled={plan.name === currentPlan?.name || !canUpgrade}
          variant={planButtonVariant(plan)}
          size={"xs"}
          className={"w-full disabled:opacity-50"}
          onClick={() => onClick(plan)}
        >
          {planLoadingIcon()}
          {planButtonText(plan)}
          {planHelpCircle(plan)}
        </Button>
      </FullTooltip>
    </div>
  );
};

export const PlanLoadingSkeleton = ({ height = 382 }: { height?: number }) => {
  return (
    <Skeleton
      height={height}
      className={"rounded-md my-0 py-0 opacity-30"}
      containerClassName={"flex"}
    />
  );
};

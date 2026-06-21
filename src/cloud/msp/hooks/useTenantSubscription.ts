import useFetchApi from "@utils/api";
import { useMemo } from "react";
import { PlanTier, Subscription } from "@/interfaces/Subscription";

type Props = {
  tenantId: string;
  allowFetch?: boolean;
};
export const useTenantSubscription = ({
  tenantId,
  allowFetch = true,
}: Props) => {
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useFetchApi<Subscription>(
      `/integrations/billing/subscription?account=${tenantId}`,
      true,
      false,
      allowFetch,
      {
        ignoreGlobalParams: true,
      },
    );
  const currentPlanTier = useMemo(() => {
    if (!subscription) return;
    if (subscription.plan_tier == PlanTier.UNKNOWN) return PlanTier.FREE;
    return subscription.plan_tier;
  }, [subscription]);

  const trialDaysRemaining = useMemo(() => {
    if (subscription?.remaining_trial === undefined) return undefined;
    return Math.ceil(subscription.remaining_trial / 86400);
  }, [subscription]);

  const isTrialExpired = useMemo(() => {
    if (
      currentPlanTier === PlanTier.TRIAL ||
      currentPlanTier === PlanTier.FREE
    ) {
      return trialDaysRemaining === 0;
    }
    return false;
  }, [currentPlanTier, trialDaysRemaining]);

  return {
    subscription,
    currentPlanTier,
    isSubscriptionLoading,
    trialDaysRemaining,
    isTrialExpired,
  };
};

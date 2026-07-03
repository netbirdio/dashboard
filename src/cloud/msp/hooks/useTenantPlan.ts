import useFetchApi from "@utils/api";
import { resolveActiveCurrency } from "@utils/billing";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import { useTenantSubscription } from "@/cloud/msp/hooks/useTenantSubscription";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { useBilling } from "@/contexts/BillingProvider";
import { AccountUsageStats } from "@/interfaces/AccountUsageStats";
import { Plan } from "@/interfaces/Plan";
import { PlanTier } from "@/interfaces/Subscription";

type Props = {
  tenant: Tenant;
  withUsage?: boolean;
};

export const useTenantPlan = ({ tenant, withUsage = true }: Props) => {
  const { mutate } = useSWRConfig();
  const { updateSubscription } = useTenants();
  const {
    plans,
    isLoading: isBillingLoading,
    getCurrentPlanByPlanTier,
    calculateEstimatedPrice,
  } = useBilling();

  // Usage stats
  const { data: stats, isLoading: isStatsLoading } =
    useFetchApi<AccountUsageStats>(
      `/integrations/billing/usage?account=${tenant.id}`,
      true,
      false,
      withUsage,
    );

  // Subscription status
  const {
    currentPlanTier,
    subscription,
    trialDaysRemaining,
    isTrialExpired,
    isSubscriptionLoading,
  } = useTenantSubscription({ tenantId: tenant.id });

  // This tenant's own billing currency, not the MSP admin's account currency
  const currency = useMemo(
    () => resolveActiveCurrency(subscription),
    [subscription],
  );

  const teamAndBusinessPlans = plans?.filter(
    (plan) =>
      plan.name.toLowerCase().includes("team") ||
      plan.name.toLowerCase().includes("business"),
  );

  const [isSubscribing, setIsSubscribing] = useState({
    team: false,
    business: false,
  });

  const subscribe = async (plan: Plan) => {
    if (!tenant) return;
    if (!subscription) return;

    let name = plan?.name?.toLowerCase() || "";
    setIsSubscribing({
      team: name === PlanTier.TEAM,
      business: name === PlanTier.BUSINESS,
    });

    const isOnFreeOrTrial =
      subscription.plan_tier === PlanTier.FREE ||
      subscription.plan_tier === PlanTier.TRIAL;

    return updateSubscription(tenant, plan, currency, isOnFreeOrTrial)
      .then(() => {
        mutate(`/integrations/billing/subscription?account=${tenant.id}`);
      })
      .finally(() => {
        setIsSubscribing({
          team: false,
          business: false,
        });
      });
  };

  const currentPlan = useMemo(() => {
    if (!plans || !currentPlanTier) return;
    return getCurrentPlanByPlanTier(currentPlanTier);
  }, [plans, currentPlanTier, getCurrentPlanByPlanTier]);

  const currentPlanPrice = useMemo(() => {
    return currentPlan?.prices.find(
      (price) => price.price_id === subscription?.price_id,
    );
  }, [currentPlan, subscription]);

  const estimatedPrice = useMemo(() => {
    if (!currentPlan || !stats || !currency) return 0;
    return calculateEstimatedPrice(currentPlan, currency, stats);
  }, [currentPlan, stats, currency, calculateEstimatedPrice]);

  const isFreePlan = currentPlan
    ? currentPlan.name.toLowerCase().includes(PlanTier.FREE)
    : true;

  const isTrial = useMemo(() => {
    if (isSubscriptionLoading && !subscription) return undefined;
    if (subscription?.plan_tier === PlanTier.BUSINESS) return false;
    if (subscription?.plan_tier === PlanTier.ENTERPRISE) return false;
    if (subscription?.remaining_trial === undefined) return false;
    return subscription.remaining_trial > 0;
  }, [subscription, isSubscriptionLoading]);

  const maxPeersOfPlan = useMemo(() => {
    const freeUsers = 0;
    return (
      100 +
      Math.max(
        currentPlan && !currentPlan.name.toLowerCase().includes(PlanTier.FREE)
          ? ((stats?.active_users || 1) - freeUsers) * 10
          : 0,
        0,
      )
    );
  }, [currentPlan, stats?.active_users]);

  const isLoading = isBillingLoading || isSubscriptionLoading || isStatsLoading;

  return {
    teamAndBusinessPlans,
    isSubscribing,
    subscribe,
    currentPlan,
    subscription,
    isLoading,
    plans: teamAndBusinessPlans,
    currency,
    stats,
    trialDaysRemaining,
    currentPlanTier,
    isTrialExpired,
    estimatedPrice,
    currentPlanPrice,
    isFreePlan,
    isTrial,
    maxPeersOfPlan,
  };
};

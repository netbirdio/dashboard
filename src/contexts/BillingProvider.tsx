import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import md5 from "crypto-js/md5";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { PlanFeatures } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { MSPTrialExpiredModal } from "@/cloud/msp/MSPTrialExpiredModal";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { Announcement, useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { AccountUsageStats } from "@/interfaces/AccountUsageStats";
import type { Group } from "@/interfaces/Group";
import { Currency, Plan, Price } from "@/interfaces/Plan";
import {
  Checkout,
  PlanTier,
  Portal,
  Subscription,
} from "@/interfaces/Subscription";
import { LimitsReachedModal } from "@/modules/billing/LimitsReachedModal";
import { TrialSuccessModal } from "@/modules/billing/trial/TrialSuccessModal";

type Props = {
  children: React.ReactNode;
};

export const usageLimitInfo: Announcement = {
  tag: "Notice",
  text: "You've reached your usage limits. For extended features and higher limits, please consider upgrading your plan.",
  link: "/settings?tab=plans-and-billing",
  linkText: "Go to Plans & Billing",
  variant: "default", // "default" or "important"
  isExternal: false,
  closeable: false,
  isCloudOnly: true,
};

export const trialExpiresInfo: Announcement = {
  tag: "Trial",
  text: "Your trial is ending soon. Need more time? Contact us to extend your trial.",
  variant: "default", // "default" or "important"
  link: "mailto:support@netbird.io",
  linkText: "support@netbird.io",
  isExternal: false,
  closeable: false,
  isCloudOnly: true,
};

export function resolveActiveCurrency(subscription?: Subscription): Currency {
  return subscription?.active && subscription?.currency
    ? subscription.currency
    : Currency.EUR;
}

export const BillingContext = React.createContext(
  {} as {
    subscription: Subscription | undefined;
    plans: Plan[] | undefined;
    stats: AccountUsageStats | undefined;
    isLoading: boolean;
    currentPlan: Plan | undefined;
    currentPlanPrice?: Price;
    maxPeersOfPlan: number;
    isFreePlan: boolean;
    estimatedPrice: number;
    visitCustomerPortal: () => Promise<void>;
    subscribe: (plan: Plan, aws?: boolean) => Promise<void>;
    changeSubscription: (plan: Plan, aws?: boolean) => Promise<void>;
    canUpgrade: boolean;
    isDowngrade: (plan: Plan) => boolean;
    usagePercentage: number;
    isTrial?: boolean;
    isTrialAvailable?: boolean;
    startTrial: (
      plan: Plan,
      feature?: keyof typeof PlanFeatures,
    ) => Promise<boolean>;
    trialDaysRemaining: number;
    currency: Currency;
    getCurrentPlanByPlanTier: (planTier: PlanTier) => Plan | undefined;
    calculateEstimatedPrice: (
      plan: Plan,
      currency: Currency,
      usage: AccountUsageStats,
    ) => number;
    isAWS: boolean;
  },
);

export default function BillingProvider({ children }: Props) {
  const { permission } = usePermissions();

  return permission?.billing?.read && isNetBirdCloud() ? (
    <BillingContextProvider>{children}</BillingContextProvider>
  ) : (
    <>{children}</>
  );
}

function BillingContextProvider({ children }: Readonly<Props>) {
  const baseURL = `${window.location.protocol}//${window.location.host}`;
  const router = useRouter();
  const currentPath = usePathname();
  const currentTab = useSearchParams().get("tab");
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { trackEvent } = useAnalytics();
  const { setAnnouncements } = useAnnouncement();
  const freeUsers = 0;

  const redirectUrl = useMemo(() => {
    return `${baseURL}${currentPath}?tab=${currentTab}`;
  }, [baseURL, currentPath, currentTab]);

  // Usage stats
  const { data: stats, isLoading: isStatsLoading } =
    useFetchApi<AccountUsageStats>("/integrations/billing/usage", false);

  // Current subscription status
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useFetchApi<Subscription>("/integrations/billing/subscription", false);

  // Plans
  const { data: plans, isLoading: isPlanLoading } = useFetchApi<Plan[]>(
    "/integrations/billing/plans",
    false,
  );

  const checkout = useApiCall<Checkout>("/integrations/billing/checkout").post;
  const changeSubscriptionRequest = useApiCall<Subscription>(
    "/integrations/billing/subscription",
  ).put;
  const customerPortal = useApiCall<Portal>("/integrations/billing/portal").get;

  const awsRequest = useApiCall<Group>(
    "/integrations/billing/aws/marketplace/activate",
  ).post;

  const isLoading = isStatsLoading || isSubscriptionLoading || isPlanLoading;

  const getCurrentPlanByPlanTier = useCallback(
    (planTier: PlanTier) => {
      if (!plans) return;
      const freePlan = plans.find((plan) =>
        plan.name.toLowerCase().includes(PlanTier.FREE),
      );
      return (
        plans.find(
          (plan) =>
            plan.name.toLowerCase().includes(planTier) &&
            planTier != PlanTier.UNKNOWN,
        ) || freePlan
      );
    },
    [plans],
  );

  const currentPlan = useMemo(() => {
    if (!subscription) return;
    return getCurrentPlanByPlanTier(subscription.plan_tier);
  }, [getCurrentPlanByPlanTier, subscription]);

  const currentPlanPrice = useMemo(() => {
    return currentPlan?.prices.find(
      (price) => price.price_id === subscription?.price_id,
    );
  }, [currentPlan, subscription]);

  const [currency, setCurrency] = useState<Currency>(Currency.EUR);

  useEffect(() => {
    if (isSubscriptionLoading) return;
    setCurrency(resolveActiveCurrency(subscription));
  }, [isSubscriptionLoading, subscription?.active, subscription?.currency]);

  const maxPeersOfPlan = useMemo(() => {
    return (
      100 +
      Math.max(
        currentPlan && !currentPlan.name.toLowerCase().includes("free")
          ? ((stats?.active_users || 1) - freeUsers) * 10
          : 0,
        0,
      )
    );
  }, [currentPlan, stats?.active_users]);

  const isFreePlan = currentPlan
    ? currentPlan.name.toLowerCase().includes("free")
    : true;

  const calculateEstimatedPrice = useCallback(
    (plan: Plan, currency: Currency, usage: AccountUsageStats) => {
      if (!plan || !usage || !currency) return 0;
      if (plan.name.toLowerCase().includes(PlanTier.FREE)) return 0;
      if (plan.name.toLowerCase().includes(PlanTier.TRIAL)) return 0;
      const subscriptionPrice = plan.prices.find(
        (price) => price.currency === currency,
      );
      if (!subscriptionPrice) return 0;

      const machinesPerUser = 10;
      let machinesIncluded = 100;

      const activeUsers = usage.active_users || 0;
      const activeMachines = usage.active_peers || 0;

      const pricePerUser = subscriptionPrice.price / 100;
      const pricePerMachine = 0.5;

      machinesIncluded = machinesIncluded + activeUsers * machinesPerUser;
      const billableMachines = Math.max(activeMachines - machinesIncluded, 0);
      const billableUsers = Math.max(activeUsers, 0);

      const machinesCost = billableMachines * pricePerMachine;
      const usersCost = billableUsers * pricePerUser;

      return machinesCost + usersCost;
    },
    [],
  );

  const estimatedPrice = useMemo(() => {
    if (!currentPlan || isFreePlan || !currentPlanPrice || !stats) return 0;
    return calculateEstimatedPrice(currentPlan, currency, stats);
  }, [
    currentPlan,
    isFreePlan,
    currentPlanPrice,
    stats,
    calculateEstimatedPrice,
    currency,
  ]);

  const subscribe = async (plan: Plan, aws?: boolean) => {
    const priceID = plan.prices.find((price) => price.currency === currency)
      ?.price_id;
    if (!priceID) return Promise.reject();

    let promise;

    if (aws) {
      try {
        promise = awsRequest({
          plan_tier: plan.name.toLowerCase(),
        }).then((res) => {
          mutate("/integrations/billing/subscription");
        });
        notify({
          title: "NetBird Subscription",
          description: `Successfully subscribed to the ${plan.name} plan`,
          loadingMessage: "Subscribing to NetBird via AWS Marketplace...",
          promise: promise,
        });
        return promise;
      } catch (err) {}
    } else {
      return checkout({ baseURL: redirectUrl, priceID }).then((response) => {
        if (response && response.url) {
          trackEvent(
            "Billing",
            `subscribe_${plan.name}`,
            `${plan.name} (${priceID})`,
          );
          router.push(response.url);
        }
      });
    }
  };

  const changeSubscription = async (plan: Plan, aws = false) => {
    const priceID = plan.prices.find((price) => price.currency === currency)
      ?.price_id;
    if (!priceID) return Promise.reject();
    const downgrade = isDowngrade(plan);
    const choice = await confirm({
      title: `${downgrade ? "Downgrade" : "Upgrade"} to ${plan.name}?`,
      description: (
        <div className={"flex flex-col gap-2 text-sm text-nb-gray-300 mt-1"}>
          <div>
            The transition to your new plan will take effect immediately.
            Charges for the new plan will be incurred from this point forward.
          </div>
        </div>
      ),
      confirmText: downgrade ? "Downgrade" : "Upgrade",
      cancelText: "Cancel",
      type: "default",
    });
    if (!choice) return;
    if (currentPlanPrice?.price_id === priceID) return Promise.reject();
    const planTier = plan.name.toLowerCase();

    const promise = changeSubscriptionRequest({
      priceID: aws ? undefined : priceID,
      plan_tier: aws ? planTier : undefined,
    }).then(() => {
      trackEvent(
        "Billing",
        `subscription_${downgrade ? "downgrade" : "upgrade"}_to_${plan.name}`,
        `Subscription ${downgrade ? "downgrade" : "upgrade"} to ${
          plan.name
        } (${priceID})`,
      );
      mutate("/integrations/billing/subscription");
    });

    notify({
      title: "Update Subscription",
      description: "Your subscription has been successfully updated.",
      promise: promise,
      loadingMessage: "Updating your subscription...",
    });

    return promise;
  };

  const visitCustomerPortal = async () => {
    return customerPortal(`?baseURL=${encodeURIComponent(redirectUrl)}`).then(
      (response) => {
        if (response && response.url) {
          trackEvent("Billing", "subscription_visit_portal", "Manage Plan");
          router.push(response.url);
        }
      },
    );
  };

  const canUpgrade = useMemo(() => {
    if (subscription && !subscription.active) return true;
    if (subscription && !subscription.updated_at) return true;
    if (subscription && subscription.plan_tier === PlanTier.FREE) return true;
    if (subscription && subscription.plan_tier === PlanTier.TRIAL) return true;
    const updatedAt = dayjs(subscription?.updated_at);
    const now = dayjs();
    const diff = now.diff(updatedAt, "hour");
    return diff >= 48;
  }, [subscription]);

  const isDowngrade = useCallback(
    (plan: Plan) => {
      if (!currentPlanPrice) return false;
      const price = plan.prices.find((price) => price.currency === currency)
        ?.price;
      if (!price) return false;
      return price < currentPlanPrice.price;
    },
    [currentPlanPrice, currency],
  );

  const usagePercentage = useMemo(() => {
    if (stats) {
      const maxUsers = 5;
      const activeUsersPercentage = (stats.active_users / maxUsers) * 100;
      const activePeersPercentage = (stats.active_peers / maxPeersOfPlan) * 100;
      if (isFreePlan)
        return Math.max(activeUsersPercentage, activePeersPercentage);
      return activePeersPercentage;
    }
    return 0;
  }, [isFreePlan, maxPeersOfPlan, stats]);

  const [trialSuccessModal, setTrialSuccessModal] = useState(false);

  const isTrial = useMemo(() => {
    if (isSubscriptionLoading && !subscription) return undefined;
    if (subscription?.plan_tier === "business") return false;
    if (subscription?.plan_tier === "enterprise") return false;
    if (subscription?.remaining_trial === undefined) return false;
    return subscription.remaining_trial > 0;
  }, [subscription, isSubscriptionLoading]);

  const isAWS = useMemo(() => {
    return subscription?.provider === "aws";
  }, [subscription]);

  const isTrialAvailable = useMemo(() => {
    if (isSubscriptionLoading && !subscription) return undefined;
    if (isAWS) return false;
    if (subscription?.plan_tier === "business") return false;
    if (subscription?.plan_tier === "enterprise") return false;
    return subscription?.remaining_trial === undefined;
  }, [subscription, isSubscriptionLoading]);

  const startTrial = async (
    plan: Plan,
    feature?: keyof typeof PlanFeatures,
  ) => {
    const priceID = plan.prices.find((price) => price.currency === currency)
      ?.price_id;
    if (!priceID) return Promise.reject("Invalid plan");
    return checkout({
      baseURL: redirectUrl,
      priceID,
      enableTrial: true,
    })
      .then((response) => {
        setTrialSuccessModal(true);
        trackEvent(
          "Billing",
          `trial_started${feature && `_on_${feature.toLowerCase()}`}`,
          "Trial Started",
        );
        mutate("/integrations/billing/subscription");
        return true;
      })
      .catch(() => false);
  };

  const trialDaysRemaining = useMemo(() => {
    if (!subscription || subscription.remaining_trial === undefined) return 0;
    return Math.ceil(subscription.remaining_trial / 86400);
  }, [subscription]);

  useEffect(() => {
    if (isLoading) return;
    if (isTrial && trialDaysRemaining <= 3) {
      setAnnouncements((prev) => {
        const prevAnnouncements = prev || [];
        const hash = md5(trialExpiresInfo.text).toString();
        return prevAnnouncements.map((a) => {
          if (a.hash === hash) {
            return { ...a, isOpen: true };
          }
          return a;
        });
      });
    }
  }, [isTrial, setAnnouncements, isLoading, trialDaysRemaining]);

  useEffect(() => {
    if (isLoading) return;
    if (usagePercentage > 100 && isFreePlan && !isTrial) {
      setAnnouncements((prev) => {
        const prevAnnouncements = prev || [];
        const usageInfoHash = md5(usageLimitInfo.text).toString();
        return prevAnnouncements.map((a) => {
          if (a.hash === usageInfoHash) {
            return { ...a, isOpen: true };
          }
          return a;
        });
      });
    }
  }, [isFreePlan, usagePercentage, setAnnouncements, isLoading, isTrial]);

  return (
    <BillingContext.Provider
      value={{
        stats,
        subscription,
        plans,
        isLoading,
        currentPlan,
        currentPlanPrice,
        maxPeersOfPlan,
        isFreePlan,
        estimatedPrice,
        subscribe,
        changeSubscription,
        visitCustomerPortal,
        canUpgrade,
        isDowngrade,
        usagePercentage,
        isTrial,
        isTrialAvailable,
        startTrial,
        trialDaysRemaining,
        currency,
        getCurrentPlanByPlanTier,
        calculateEstimatedPrice,
        isAWS,
      }}
    >
      <TrialSuccessModal
        open={trialSuccessModal}
        setOpen={setTrialSuccessModal}
      />
      <LimitsReachedModal />
      <MSPTrialExpiredModal />
      {children}
    </BillingContext.Provider>
  );
}

export const useBilling = () => {
  return React.useContext(BillingContext);
};

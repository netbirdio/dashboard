import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import { VerticalTabs } from "@components/VerticalTabs";
import * as Tabs from "@radix-ui/react-tabs";
import { isNetBirdCloud } from "@utils/netbird";
import { CreditCardIcon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useBilling } from "@/contexts/BillingProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Plan } from "@/interfaces/Plan";
import { PlanTier } from "@/interfaces/Subscription";
import { PlanCard, PlanLoadingSkeleton } from "@/modules/billing/PlanCard";
import { PlanCurrentPlan } from "@/modules/billing/PlanCurrentPlan";
import { PlanSuccessModal } from "@/modules/billing/PlanSuccessModal";
import { TrialGradientCard } from "@/modules/billing/trial/TrialGradientCard";

export const PlansAndBillingTab = () => {
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  const canViewBilling = permission?.billing?.update && isNetBirdCloud();
  if (!canViewBilling) return;

  return <PlansAndBillingTabContent />;
};

export const PlansAndBillingTabTrigger = () => {
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  const canViewBilling = permission?.billing?.update && isNetBirdCloud();
  if (!canViewBilling) return;

  return (
    <VerticalTabs.Trigger
      value="plans-and-billing"
      data-testid="settings-tab-plans-and-billing"
    >
      <CreditCardIcon size={14} />
      Plans & Billing
    </VerticalTabs.Trigger>
  );
};

const PlansAndBillingTabContent = () => {
  const {
    plans,
    subscription,
    currentPlan,
    subscribe,
    canUpgrade,
    changeSubscription,
    isTrialAvailable,
    isTrial,
    currency,
    currentPlanPrice,
    trialDaysRemaining,
    estimatedPrice,
    isFreePlan,
    maxPeersOfPlan,
    stats,
    isAWS,
  } = useBilling();

  const teamAndBusinessPlans = React.useMemo(() => {
    const filteredPlans = plans?.filter(
      (plan) =>
        plan.name.toLowerCase().includes("team") ||
        plan.name.toLowerCase().includes("business"),
    );

    if (
      !filteredPlans ||
      !subscription?.active ||
      !subscription?.price ||
      subscription.plan_tier === PlanTier.FREE ||
      subscription.plan_tier === PlanTier.TRIAL
    ) {
      return filteredPlans;
    }

    return filteredPlans.map((plan) => {
      const planTier = plan.name.toLowerCase();
      const isCurrentPlan =
        planTier === subscription.plan_tier.toLowerCase() &&
        (planTier === PlanTier.TEAM || planTier === PlanTier.BUSINESS);

      if (!isCurrentPlan) {
        return plan;
      }

      const updatedPrices = plan.prices.map((price) => {
        if (price.currency === subscription.currency) {
          return {
            ...price,
            price: subscription.price!,
          };
        }
        return price;
      });

      return {
        ...plan,
        prices: updatedPrices,
      };
    });
  }, [plans, subscription]);

  const [isSubscribing, setIsSubscribing] = useState({
    team: false,
    business: false,
  });

  const subscribeToPlan = async (plan: Plan) => {
    let name = plan?.name?.toLowerCase() || "";
    setIsSubscribing({
      team: name === PlanTier.TEAM,
      business: name === PlanTier.BUSINESS,
    });
    if (subscription?.active == true && !isTrial) {
      await changeSubscription(plan, isAWS);
    } else {
      await subscribe(plan, isAWS);
    }
    setIsSubscribing({
      team: false,
      business: false,
    });
  };

  return (
    <Tabs.Content
      value={"plans-and-billing"}
      data-testid="settings-content-plans-and-billing"
    >
      <PlanSuccessModal />
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=plans-and-billing"}
            label={"Plans & Billing"}
            icon={<CreditCardIcon size={14} />}
            active
          />
        </Breadcrumbs>

        <div className={"flex items-center justify-between max-w-4xl mb-4"}>
          <h1>Plans & Billing</h1>
        </div>

        {isTrialAvailable && (
          <div className={"flex flex-col gap-4 max-w-3xl mb-6"}>
            {currentPlan ? (
              <TrialGradientCard />
            ) : (
              <Skeleton
                height={100}
                className={"rounded-md my-0 py-0 opacity-30"}
                containerClassName={"flex"}
              />
            )}
          </div>
        )}

        <div className={"flex flex-col gap-4 max-w-3xl"}>
          {currentPlan ? (
            <PlanCurrentPlan
              currentPlan={currentPlan}
              currentPlanPrice={currentPlanPrice}
              trialDaysRemaining={trialDaysRemaining}
              estimatedPrice={estimatedPrice}
              isFreePlan={isFreePlan}
              isTrial={isTrial}
              maxPeersOfPlan={maxPeersOfPlan}
              stats={stats}
              showManagePlanIfAvailable={true}
              aws={isAWS}
            />
          ) : (
            <Skeleton
              height={127}
              className={"rounded-md my-0 py-0 opacity-30"}
              containerClassName={"flex"}
            />
          )}
        </div>
      </div>
      <Separator />
      <div className={"px-8 py-6"}>
        <div className={"max-w-3xl"}>
          <h2>
            {subscription?.active
              ? "Update your NetBird Plan"
              : "Upgrade your NetBird Plan"}
          </h2>

          <Paragraph>
            Increase your user and peer limit by upgrading your plan.
          </Paragraph>
          <Paragraph>
            With our flexible pricing, you are only billed for active users and
            active peers.
          </Paragraph>
          <Paragraph>
            Find out which{" "}
            <InlineLink href={"https://netbird.io/pricing"} target={"_blank"}>
              Pricing Plan
              <ExternalLinkIcon size={12} />
            </InlineLink>
            suits you the best by visiting our website.
          </Paragraph>

          <div
            className={
              "grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4 mt-5"
            }
          >
            {!plans && (
              <>
                <PlanLoadingSkeleton />
                <PlanLoadingSkeleton />
              </>
            )}
            {teamAndBusinessPlans?.map((plan) => (
              <PlanCard
                currentPlan={currentPlan}
                currentSubscription={subscription}
                plan={plan}
                currency={currency}
                isSubscribing={isSubscribing}
                onClick={subscribeToPlan}
                key={plan.name}
              />
            ))}
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
};

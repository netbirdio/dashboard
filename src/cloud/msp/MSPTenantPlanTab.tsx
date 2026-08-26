import { TabsContent, TabsTrigger } from "@components/Tabs";
import { CreditCardIcon } from "lucide-react";
import * as React from "react";
import { useTenantPlan } from "@/cloud/msp/hooks/useTenantPlan";
import { Tenant, TenantStatus } from "@/cloud/msp/interfaces/Tenant";
import { PlanCard, PlanLoadingSkeleton } from "@/modules/billing/PlanCard";

type Props = {
  tenant: Tenant;
};

export const MSPTenantPlanTab = ({ tenant }: Props) => {
  const {
    plans,
    isLoading,
    currentPlan,
    currency,
    isSubscribing,
    subscribe,
    subscription,
  } = useTenantPlan({ tenant });

  const isActive = tenant.status === TenantStatus.Active;
  if (!isActive) return null;

  return (
    <TabsContent value={"plan"} className={"px-8 pb-6"}>
      <div className={"grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4"}>
        {(!plans || isLoading) && (
          <>
            <PlanLoadingSkeleton height={378} />
            <PlanLoadingSkeleton height={378} />
          </>
        )}
        {!isLoading &&
          plans?.map((plan) => {
            return (
              <PlanCard
                currentPlan={currentPlan}
                currentSubscription={subscription}
                plan={plan}
                currency={currency}
                isSubscribing={isSubscribing}
                onClick={() => subscribe(plan)}
                key={plan.name}
              />
            );
          })}
      </div>
    </TabsContent>
  );
};

export const MSPTenantPlanTabTrigger = ({ tenant }: Props) => {
  if (!tenant) return null;

  const isActive = tenant.status === TenantStatus.Active;
  if (!isActive) return null;

  return (
    <TabsTrigger value={"plan"}>
      <CreditCardIcon
        size={16}
        className={
          "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
        }
      />
      Plan
    </TabsTrigger>
  );
};

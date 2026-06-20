import React from "react";
import { BillingContext, useBilling } from "@/contexts/BillingProvider";
import { Plan } from "@/interfaces/Plan";

/**
 * Hook to get the trial status and plan information
 * For self-hosted cloud, this hook will always return the default state
 */

const defaultState = {
  isTrial: false,
  isTrialAvailable: true,
  trialDaysRemaining: undefined,
  currentPlan: {
    name: "free",
  },
  startTrial: async (plan: Plan) => false,
  plans: undefined,
  canUpgrade: false,
};

export const useTrial = () => {
  const billingContext = React.useContext(BillingContext);

  if (typeof useBilling === "undefined") return defaultState;
  if (!useBilling) return defaultState;
  if (!billingContext) return defaultState;

  return {
    isTrial: billingContext.isTrial,
    isTrialAvailable: billingContext.isTrialAvailable,
    trialDaysRemaining: billingContext.trialDaysRemaining,
    currentPlan: billingContext.currentPlan,
    startTrial: billingContext.startTrial,
    canUpgrade: billingContext.canUpgrade,
    plans: billingContext.plans,
  };
};

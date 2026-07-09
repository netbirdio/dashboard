import { isNetBirdCloud, testEditionOverride } from "@utils/netbird";
import { useTrial } from "@/cloud/cloud-hooks/useTrial";
import { useBilling } from "@/contexts/BillingProvider";
import { useIsLicensed } from "@/hooks/useIsLicensed";
import { PlanTier } from "@/interfaces/Subscription";

export enum PlanFeatures {
  IDP_SYNC = "IDP_SYNC",
  DEVICE_APPROVALS = "DEVICE_APPROVALS",
  EDR = "EDR",
  POSTURE_CHECKS = "POSTURE_CHECKS",
  EVENT_STREAMING = "EVENT_STREAMING",
  MSP = "MSP",
  TRAFFIC_EVENTS = "TRAFFIC_EVENTS",
}

/**
 * Used to show "Available on Business" etc. labels when a specific feature is locked
 */

export const PlanFeatureAvailability = {
  [PlanFeatures.IDP_SYNC]: PlanTier.TEAM,
  [PlanFeatures.MSP]: PlanTier.TEAM,
  [PlanFeatures.EDR]: PlanTier.BUSINESS,
  [PlanFeatures.DEVICE_APPROVALS]: PlanTier.BUSINESS,
  [PlanFeatures.POSTURE_CHECKS]: PlanTier.BUSINESS,
  [PlanFeatures.EVENT_STREAMING]: PlanTier.BUSINESS,
  [PlanFeatures.TRAFFIC_EVENTS]: PlanTier.BUSINESS,
};

/**
 * Features served by the open-source management server. They stay unlocked on
 * every self-hosted deployment regardless of license.
 */
const OPEN_SOURCE_FEATURES: Array<keyof typeof PlanFeatures> = [
  "POSTURE_CHECKS",
  "DEVICE_APPROVALS",
];

/**
 * Hook to check if a feature is locked based on the current plan.
 * On NetBird Cloud the lock follows the subscription plan, for trial users it
 * always returns false. On self-hosted deployments features included in the
 * open-source management server are always unlocked, the rest follow the
 * license (NETBIRD_LICENSED or the licensed management server probe).
 */

export const useIsFeatureLocked = (feature: keyof typeof PlanFeatures) => {
  const { subscription, isLoading } = useBilling();
  const { isTrial, currentPlan } = useTrial();
  const { isLicensed } = useIsLicensed();

  // TODO: Do not commit, remove after commit
  return false;

  if (process.env.APP_ENV === "test" && !testEditionOverride()) return false;

  if (!isNetBirdCloud()) {
    if (OPEN_SOURCE_FEATURES.includes(feature)) return false;
    return !isLicensed;
  }
  if (isTrial) return false;

  // Lock all features for free users
  if (!currentPlan) return true;
  let planName = currentPlan.name.toLowerCase();
  if (planName.includes("free")) return true;

  // Lock while billing is loading
  if (isLoading) return true;

  // Lock features based on what is available in subscription.features
  if (subscription?.features && subscription?.features?.length > 0) {
    if (subscription.features.includes(PlanFeatures[feature])) return false;
  }

  return true;
};

import { PlanFeatures } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { Currency } from "@/interfaces/Plan";

export interface Subscription {
  active: boolean;
  plan_tier: PlanTier;
  price_id: string;
  price?: number;
  currency: Currency;
  updated_at: Date;
  remaining_trial?: number; // In seconds
  features?: PlanFeatures[];
  provider?: string;
}

export interface Portal {
  url: string;
}

export interface Checkout {
  url: string;
}

export enum PlanTier {
  UNKNOWN = "",
  FREE = "free",
  TEAM = "team",
  BUSINESS = "business",
  ENTERPRISE = "enterprise",
  TRIAL = "trial",
}

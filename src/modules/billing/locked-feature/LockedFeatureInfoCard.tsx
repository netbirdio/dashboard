import { cn } from "@utils/helpers";
import * as React from "react";
import {
  PlanFeatures,
  useIsFeatureLocked,
} from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { LockedFeatureContent } from "@/modules/billing/locked-feature/LockedFeatureContent";

export type LockedFeatureInfoCardProps = {
  className?: string;
  children?: React.ReactNode;
  isTooltip?: boolean;
  featureText?: string;
  feature: keyof typeof PlanFeatures;
  isCard?: boolean;
  offerTrial?: boolean;
};

export const LockedFeatureInfoCard = ({
  className,
  featureText = "This",
  feature,
  offerTrial = true,
}: LockedFeatureInfoCardProps) => {
  const isLocked = useIsFeatureLocked(feature);
  if (!isLocked) return;

  return (
    <div className={cn("mt-5", className)}>
      <div
        className={cn(
          "text-sm",
          "w-full bg-gradient-to-r from-nb-gray-920 to-nb-gray-900 backdrop-blur px-6 py-4",
          "gap-3 rounded-md border border-nb-gray-800 max-w-[745px]",
          "items-center flex justify-between",
        )}
      >
        <LockedFeatureContent
          featureText={featureText}
          feature={feature}
          isCard={true}
          offerTrial={offerTrial}
        />
      </div>
    </div>
  );
};

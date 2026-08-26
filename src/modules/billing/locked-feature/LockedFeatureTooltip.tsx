import FullTooltip from "@components/FullTooltip";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { LockedFeatureContent } from "@/modules/billing/locked-feature/LockedFeatureContent";
import { LockedFeatureInfoCardProps } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";

type Props = {
  side?: "top" | "bottom" | "left" | "right";
} & LockedFeatureInfoCardProps;

export const LockedFeatureTooltip = ({
  children,
  side = "top",
  feature,
  featureText,
}: Props) => {
  const isLocked = useIsFeatureLocked(feature);
  if (!isLocked) return <>{children}</>;

  return (
    <FullTooltip
      interactive={true}
      className={cn("overflow-hidden")}
      contentClassName={
        "p-0 !border !border-nb-gray-800 bg-gradient-to-r from-nb-gray-920 to-nb-gray-900"
      }
      content={
        <div
          className={
            "flex flex-col justify-between gap-2 max-w-[340px] px-5 pt-3 pb-4 relative"
          }
        >
          <GradientFadedBackground />
          <LockedFeatureContent
            feature={feature}
            featureText={featureText}
            isTooltip={true}
          />
        </div>
      }
      side={side}
      align={"center"}
    >
      {children}
    </FullTooltip>
  );
};

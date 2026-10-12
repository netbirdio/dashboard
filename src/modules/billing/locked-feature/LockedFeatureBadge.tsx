import { IconHelpCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { LockIcon } from "lucide-react";
import * as React from "react";
import {
  PlanFeatureAvailability,
  useIsFeatureLocked,
} from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { PLAN_TEXT } from "@/modules/billing/locked-feature/LockedFeatureContent";
import { LockedFeatureInfoCardProps } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureTooltip } from "@/modules/billing/locked-feature/LockedFeatureTooltip";

type Props = {
  position?: "absolute" | "relative";
  side?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
  center?: boolean;
} & LockedFeatureInfoCardProps;

export const LockedFeatureBadge = ({
  className = "",
  children,
  position = "absolute",
  feature,
  featureText,
  side = "top",
  disabled = false,
  center = false,
}: Props) => {
  const isLocked = useIsFeatureLocked(feature);
  if (disabled) return <>{children}</>;
  if (!isLocked) return <>{children}</>;
  const plan = PlanFeatureAvailability[feature];

  const preventKeyboardEvents = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={"relative"}>
      <div
        className={cn(
          "flex gap-2 w-full h-full left-0 top-0 z-20 group cursor-help",
          className,
          position === "absolute"
            ? "absolute items-center px-5 py-5"
            : "relative",
          center ? "justify-center" : "justify-end",
        )}
      >
        <LockedFeatureTooltip
          feature={feature}
          side={side}
          featureText={featureText}
        >
          <div
            className={cn(
              "inline-flex shrink-0 text-xs bg-nb-gray-500/50 backdrop-blur items-center gap-1.5 px-[10px] py-[6px] rounded-full leading-none",
              "group-hover:bg-nb-gray-500/40 transition-all duration-300",
            )}
          >
            <LockIcon size={12} className={"relative -top-[1px]"} />
            {isNetBirdCloud()
              ? plan == "team"
                ? PLAN_TEXT.TEAM
                : PLAN_TEXT.BUSINESS
              : PLAN_TEXT.ENTERPRISE}
            <IconHelpCircle size={13} className={"relative -top-[1px]"} />
          </div>
        </LockedFeatureTooltip>
      </div>
      <div
        className={"opacity-40 pointer-events-none select-none"}
        tabIndex={-1}
        onKeyUp={preventKeyboardEvents}
        onKeyDown={preventKeyboardEvents}
      >
        {children}
      </div>
    </div>
  );
};

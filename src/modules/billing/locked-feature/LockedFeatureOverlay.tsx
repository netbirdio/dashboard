import * as React from "react";
import {
  PlanFeatures,
  useIsFeatureLocked,
} from "@/cloud/cloud-hooks/useIsFeatureLocked";

type Props = {
  children: React.ReactNode;
  opacity?: number;
  feature: keyof typeof PlanFeatures;
};

export const LockedFeatureOverlay = ({
  children,
  opacity = 50,
  feature,
}: Props) => {
  const isLocked = useIsFeatureLocked(feature);
  if (!isLocked) return <>{children}</>;

  const preventKeyboardEvents = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={"pointer-events-none select-none"}
      style={{
        opacity: opacity / 100,
      }}
      tabIndex={-1}
      onKeyUp={preventKeyboardEvents}
      onKeyDown={preventKeyboardEvents}
    >
      {children}
    </div>
  );
};

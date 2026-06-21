import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { LockIcon, Sparkles } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PLAN_TEXT } from "@/modules/billing/locked-feature/LockedFeatureContent";
import { SelfHostedUpgradeButton } from "@/modules/billing/trial/TrialOrUpgradeButton";

type Props = {
  onClick: () => void;
};

export const FirewallGPTButton = ({ onClick }: Props) => {
  const { permission } = usePermissions();

  if (!isNetBirdCloud()) {
    return (
      <FullTooltip
        interactive={true}
        content={
          <div className={"flex flex-col gap-2 max-w-[280px] px-1 py-1"}>
            <div className={"flex items-center gap-1.5 text-sm font-normal"}>
              <LockIcon size={12} />
              {PLAN_TEXT.ENTERPRISE}
            </div>
            <div className={"text-xs text-nb-gray-300 font-light"}>
              Smart Firewall uses AI to help you create access policies and is
              available with a NetBird Enterprise commercial license.
            </div>
            <SelfHostedUpgradeButton />
          </div>
        }
      >
        <FirewallGPTButtonContent disabled={true} />
      </FullTooltip>
    );
  }

  return (
    permission?.assistant?.read && (
      <FirewallGPTButtonContent
        onClick={onClick}
        disabled={!permission?.assistant?.create}
      />
    )
  );
};

const FirewallGPTButtonContent = ({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled: boolean;
}) => {
  return (
    <button
      className={cn(
        "animated-gradient-bg gap-2 flex items-center justify-center text-sm font-medium p-[2px] rounded-md group cursor-pointer",
        "disabled:bg-nb-gray-930/40 disabled:cursor-not-allowed disabled:opacity-40",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div
        className={cn(
          "flex items-center justify-center w-full h-full gap-2 bg-nb-gray-930/40 px-3 py-2.5 rounded-md transition-colors duration-200",
          "group-hover:bg-nb-gray-930/60",
        )}
      >
        <Sparkles size={14} />
        Smart Firewall
      </div>
    </button>
  );
};

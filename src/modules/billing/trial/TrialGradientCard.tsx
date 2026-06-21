import { IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Sparkles } from "lucide-react";
import * as React from "react";
import { useBilling } from "@/contexts/BillingProvider";
import { PlanTier } from "@/interfaces/Subscription";
import { TrialOrUpgradeButton } from "@/modules/billing/trial/TrialOrUpgradeButton";

export const TrialGradientCard = () => {
  const { currentPlan, canUpgrade, isTrialAvailable } = useBilling();
  let planName = currentPlan?.name || "Free";
  if (!isTrialAvailable) return null;

  return (
    <div
      className={
        "flex flex-col bg-gradient-to-r from-[#6697FF]/60 to-[#CE8EE3]/70 backdrop-blur rounded-md overflow-hidden"
      }
    >
      <div className={cn("text-sm", "w-full px-6 py-4")}>
        <div
          className={
            "items-start md:items-center justify-between flex flex-col md:flex-row gap-5"
          }
        >
          <div className={"z-10 relative"}>
            <div
              className={cn(
                "flex items-center font-normal mb-1",
                "text-base gap-2 ",
              )}
            >
              <Sparkles size={16} className={cn("relative", "-top-[0px]")} />
              {`Try all of NetBird's features for free`}
            </div>
            <div className={cn("font-light")}>
              {`Activate your 14-day trial to access NetBird's full set of features & integrations. After the trial, you will return to your ${planName} plan unless you choose to upgrade.`}
            </div>
          </div>
          <TrialOrUpgradeButton plan={PlanTier.BUSINESS} variant={"white"} />
        </div>
      </div>
      {!canUpgrade && (
        <div
          className={"inline gap-1 font-light bg-black/50 px-5 text-xs py-3"}
        >
          <IconInfoCircle
            size={13}
            className={cn("relative -top-[1px] mr-1 inline")}
          />
          Your plan was recently updated. Please wait for 48 hours from the last
          update to change your plan again.
        </div>
      )}
    </div>
  );
};

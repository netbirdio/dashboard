import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useTrial } from "@/cloud/cloud-hooks/useTrial";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { PlanIcon } from "@/modules/billing/PlanIcon";

export const TrialNavigationInfoCard = () => {
  const router = useRouter();
  const { isOwnerOrAdmin } = useLoggedInUser();
  const { trialDaysRemaining } = useTrial();

  return (
    <div
      className={cn(
        "w-full rounded-md text-xs flex flex-col gap-3 whitespace-normal border",
        "bg-nb-gray-900/20 py-4 px-4 border-nb-gray-800/30 relative",
      )}
    >
      <div className={"flex items-center text-sm gap-3"}>
        <PlanIcon name={"trial"} size={33} />
        <div className={"min-w-0"}>
          <div className={"font-semibold"}>Free Trial</div>
          <div className={"truncate text-xs text-nb-gray-300 transition-all"}>
            Trial ends in {trialDaysRemaining} days
          </div>
        </div>
      </div>

      {isOwnerOrAdmin && (
        <div className={"flex gap-3 text-xs font-medium"}>
          <Button
            variant={"input"}
            size={"xs"}
            className={"w-full"}
            onClick={() => {
              router.push("/settings?tab=plans-and-billing");
            }}
          >
            Upgrade Plan
          </Button>
        </div>
      )}
    </div>
  );
};

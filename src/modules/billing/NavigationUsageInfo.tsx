import Button from "@components/Button";
import { IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { MonitorSmartphoneIcon, Users2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useBilling } from "@/contexts/BillingProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PlanIcon } from "@/modules/billing/PlanIcon";
import { TrialNavigationInfoCard } from "@/modules/billing/trial/TrialNavigationInfoCard";

export const NavigationUsageInfo = () => {
  const { permission } = usePermissions();
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  const canViewBilling = permission?.billing?.update && isNetBirdCloud();
  if (!canViewBilling) return;

  return (
    <div
      className={cn(
        "px-4 py-4 animate-fade-in",
        isNavigationCollapsed &&
          !mobileNavOpen &&
          "hidden md:group-hover/navigation:block",
      )}
    >
      <NavigationUsageInfoContent />
    </div>
  );
};

const NavigationUsageInfoContent = () => {
  const {
    currentPlan: plan,
    stats,
    isLoading,
    maxPeersOfPlan: maxPeers,
    isFreePlan,
    usagePercentage,
    isTrial,
  } = useBilling();

  const router = useRouter();
  const { permission } = usePermissions();
  const { trackEvent } = useAnalytics();

  if (isLoading)
    return <Skeleton height={164} className={"rounded-lg opacity-60"} />;

  if (isTrial) return <TrialNavigationInfoCard />;

  return (
    <div
      role={"button"}
      className={cn(
        "w-full rounded-md text-xs flex flex-col gap-3 whitespace-normal border text-left",
        isFreePlan
          ? "bg-nb-gray-900/20 py-4 px-4 border-nb-gray-800/30"
          : "hover:border-nb-gray-900 p-3 border-transparent hover:bg-nb-gray-900/70 cursor-pointer transition-all",
        !permission?.billing?.update && "pointer-events-none",
      )}
      onClick={() => {
        permission?.billing?.update &&
          router.push("/settings?tab=plans-and-billing");
      }}
    >
      {plan && (
        <div className={"flex items-center text-sm gap-3"}>
          <PlanIcon name={plan?.name} size={33} />
          <div className={"min-w-0"}>
            <div className={"font-medium"}>{plan.name}</div>
            <div className="overflow-hidden whitespace-nowrap overflow-ellipsis text-xs text-nb-gray-300 transition-all max-w-[130px]">
              {plan.description}
            </div>
          </div>
        </div>
      )}

      {isFreePlan && (
        <>
          <div className={"flex flex-col gap-1"}>
            <div className={"flex gap-2 items-center"}>
              <Users2Icon size={13} />
              <div>
                <span className={"font-medium text-white"}>
                  {stats?.active_users}
                </span>
                {isFreePlan ? (
                  <span className={"text-nb-gray-300"}> of 5 Users</span>
                ) : (
                  <span className={"text-nb-gray-300"}>
                    {" "}
                    {stats?.active_peers && stats.active_peers > 1
                      ? "Users"
                      : "User"}
                  </span>
                )}
              </div>
            </div>

            <div className={"flex gap-2 items-center"}>
              <MonitorSmartphoneIcon size={13} />
              <div>
                <span className={"font-medium text-white"}>
                  {stats?.active_peers}
                </span>
                <span className={"text-nb-gray-300"}> of {maxPeers} Peers</span>
              </div>
            </div>
          </div>
          <div>
            <div className={"flex gap-2 items-center"}>
              <div
                className={
                  "h-2 w-full rounded-full relative overflow-hidden bg-nb-gray-800"
                }
              >
                <div
                  className={cn(
                    "absolute h-full",
                    isFreePlan && usagePercentage >= 100
                      ? "bg-red-500"
                      : "from-netbird to-netbird-500 bg-gradient-to-r",
                  )}
                  style={{
                    width: `${usagePercentage}%`,
                  }}
                ></div>
              </div>
            </div>
            {isFreePlan && usagePercentage >= 80 && (
              <div
                className={cn(
                  "text-red-500 flex gap-1.5 items-center mt-1.5",
                  usagePercentage >= 100 ? "text-red-500" : "text-netbird",
                )}
              >
                <IconInfoCircle size={12} className={"font-medium"} />
                {usagePercentage >= 100
                  ? "Usage limit reached"
                  : "Approaching usage limit"}
              </div>
            )}
          </div>

          {permission?.billing?.update && (
            <div className={"flex gap-3 text-xs font-medium"}>
              <Button
                variant={"primary"}
                size={"xs"}
                className={"w-full"}
                onClick={() => {
                  isFreePlan &&
                    trackEvent(
                      "Billing",
                      "button_click",
                      "Upgrade Plan (Navigation)",
                    );
                  router.push("/settings?tab=plans-and-billing");
                }}
              >
                {isFreePlan ? "Upgrade Plan" : "Plans & Billing"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

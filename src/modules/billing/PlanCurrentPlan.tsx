import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import {
  CreditCardIcon,
  EditIcon,
  ExternalLinkIcon,
  HelpCircle,
  MonitorSmartphoneIcon,
  Users2Icon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useBilling } from "@/contexts/BillingProvider";
import { AccountUsageStats } from "@/interfaces/AccountUsageStats";
import { Currency, Plan, Price } from "@/interfaces/Plan";
import { PlanIcon } from "@/modules/billing/PlanIcon";

type Props = {
  currentPlan: Plan;
  stats?: AccountUsageStats;
  isFreePlan: boolean;
  maxPeersOfPlan: number;
  estimatedPrice: number;
  isTrial?: boolean;
  trialDaysRemaining: number;
  showManagePlanIfAvailable?: boolean;
  currentPlanPrice?: Price;
  aws?: boolean;
};
export const PlanCurrentPlan = ({
  currentPlan,
  stats,
  showManagePlanIfAvailable = false,
  isFreePlan,
  maxPeersOfPlan,
  estimatedPrice,
  isTrial,
  trialDaysRemaining,
  currentPlanPrice,
  aws = false,
}: Props) => {
  const { visitCustomerPortal } = useBilling();

  return (
    <div
      className={"bg-nb-gray-930/70 border border-nb-gray-900/70 rounded-md"}
    >
      <div
        className={
          "flex justify-between gap-10 items-end p-4 bg-nb-gray-900/30"
        }
      >
        <div
          className={"flex items-center justify-start text-sm gap-3 min-w-0"}
        >
          <PlanIcon name={isTrial ? "trial" : currentPlan?.name} size={38} />

          <div className={"flex-col flex min-w-0"}>
            <div className={"font-medium"}>
              {isTrial ? "Free Trial" : currentPlan.name}
            </div>
            <FullTooltip
              content={
                <div className={"text-xs max-w-xs"}>
                  {isTrial
                    ? `Trial ends in ${trialDaysRemaining} days`
                    : currentPlan.description}
                </div>
              }
              disabled={isTrial}
              interactive={false}
              className={"min-w-0 flex"}
            >
              <div
                className={cn(
                  "text-nb-gray-400 font-normal truncate transition-all",
                  !isTrial && "hover:text-nb-gray-400/80",
                )}
              >
                {isTrial
                  ? `Trial ends in ${trialDaysRemaining} days`
                  : currentPlan.description}
              </div>
            </FullTooltip>
          </div>
        </div>
        {!isFreePlan && showManagePlanIfAvailable && (
          <>
            {aws ? (
              <div
                className={"flex gap-2 items-center justify-end shrink-0 mr-3"}
              >
                <Link
                  href={"https://aws.amazon.com/marketplace"}
                  target={"_blank"}
                >
                  <Button variant={"secondary"} size={"xs"}>
                    Visit AWS Marketplace
                    <ExternalLinkIcon size={12} />
                  </Button>
                </Link>
              </div>
            ) : (
              <div
                className={"flex gap-2 items-center justify-end shrink-0 mr-3"}
              >
                <Button
                  variant={"secondary"}
                  size={"xs"}
                  onClick={visitCustomerPortal}
                >
                  <EditIcon size={12} />
                  Manage Plan
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className={"px-6 py-4 border-t border-nb-gray-900/50"}>
        {isTrial && (
          <div
            className={"flex gap-2 items-center text-sm text-nb-gray-300 mb-4"}
          >
            {`You currently have access to NetBird's full set of features & integrations. `}
            {currentPlan.name == "Team" &&
              `Your Team plan remains active during this trial. `}
            {`After the trial, you will return to your ${currentPlan.name} plan unless you choose to upgrade.`}
          </div>
        )}
        <div className={"flex w-full gap-10 "}>
          <div className={"flex gap-2 items-center text-sm"}>
            <Users2Icon size={18} />
            <div>
              <span className={"font-medium text-white"}>
                {stats?.active_users}
              </span>
              {isFreePlan && !isTrial ? (
                <span className={"text-nb-gray-300"}> of 5 Users</span>
              ) : (
                <span className={"text-nb-gray-300"}>
                  {" "}
                  {stats?.active_users == 1 ? "User" : "Users"}
                </span>
              )}
            </div>
          </div>

          <div className={"flex gap-2 items-center text-sm"}>
            <MonitorSmartphoneIcon size={18} />
            <div>
              <span className={"font-medium text-white"}>
                {stats?.active_peers}
              </span>

              {isTrial ? (
                <span className={"text-nb-gray-300"}>
                  {stats?.active_peers == 1 ? ` Peer` : ` Peers`}
                </span>
              ) : (
                <span className={"text-nb-gray-300"}>
                  {` of ${maxPeersOfPlan} Peers`}
                </span>
              )}
            </div>
          </div>

          {!isFreePlan && !isTrial && (
            <div className={"flex gap-2 items-center text-sm"}>
              <CreditCardIcon size={18} />
              <div>
                <span className={"font-medium text-white"}>
                  {currentPlanPrice?.currency == Currency.USD && "$"}
                  {estimatedPrice}
                  {currentPlanPrice?.currency == Currency.EUR && "€"}
                </span>
                <span className={"text-nb-gray-300"}> per month</span>
              </div>
              <FullTooltip
                content={
                  <div className={"text-xs max-w-sm"}>
                    The estimated price is calculated based on the number of
                    active users and active peers.
                  </div>
                }
                interactive={false}
              >
                <HelpCircle
                  size={14}
                  className={
                    "text-nb-gray-300 hover:text-netbird transition-all cursor-pointer"
                  }
                />
              </FullTooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

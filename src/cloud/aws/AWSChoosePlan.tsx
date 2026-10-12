import Button from "@components/Button";
import Card from "@components/Card";
import { Modal, ModalPortal } from "@components/modal/Modal";
import { NetBirdLogo } from "@components/NetBirdLogo";
import Paragraph from "@components/Paragraph";
import { DialogContent } from "@radix-ui/react-dialog";
import { cn } from "@utils/helpers";
import { LogOutIcon, MailIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import AWSMarketplaceLogo from "@/assets/integrations/aws-marketplace.svg";
import { useBilling } from "@/contexts/BillingProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Currency, Plan } from "@/interfaces/Plan";
import { PlanTier } from "@/interfaces/Subscription";
import { PlanCard, PlanLoadingSkeleton } from "@/modules/billing/PlanCard";

type Props = {
  onSuccess?: () => void;
};

export const AWSChoosePlan = ({ onSuccess }: Props) => {
  const [open, setOpen] = useState(true);
  const {
    plans,
    isLoading,
    subscription,
    changeSubscription,
    isTrial,
    subscribe,
  } = useBilling();
  const { logout } = useLoggedInUser();

  const teamAndBusinessPlans = plans?.filter(
    (plan) =>
      plan.name.toLowerCase().includes("team") ||
      plan.name.toLowerCase().includes("business"),
  );

  const [isSubscribing, setIsSubscribing] = useState({
    team: false,
    business: false,
  });

  const hasActiveStripePlan =
    subscription?.active === true && subscription?.provider !== "aws";

  const hasPlan =
    subscription?.plan_tier !== PlanTier.FREE &&
    subscription?.plan_tier !== PlanTier.TRIAL;

  const hasActiveAWSPlan = hasPlan && subscription?.provider === "aws";

  // If there is an active AWS plan, skip the plan selection
  useEffect(() => {
    if (hasActiveAWSPlan) {
      onSuccess?.();
      setOpen(false);
    }
  }, [hasActiveAWSPlan]);

  const subscribeToPlan = async (plan: Plan) => {
    let name = plan?.name?.toLowerCase() || "";
    setIsSubscribing({
      team: name === PlanTier.TEAM,
      business: name === PlanTier.BUSINESS,
    });
    if (hasPlan && !isTrial) {
      changeSubscription(plan, true).then(() => {
        onSuccess?.();
        setOpen(false);
      });
    } else {
      subscribe(plan, true).then(() => {
        onSuccess?.();
        setOpen(false);
      });
    }
    setIsSubscribing({
      team: false,
      business: false,
    });
  };

  return (
    <Modal open={open}>
      <ModalPortal>
        <DialogContent
          className={
            "h-screen w-screen fixed z-[100] left-0 top-0 bg-nb-gray-950 flex overflow-y-auto focus:outline-none"
          }
        >
          <div
            className={
              "w-full sm:px-4 py-10 max-w-3xl mx-auto flex flex-col items-center"
            }
          >
            <div
              className={cn("flex flex-col items-center justify-center w-full")}
            >
              <div className={"flex items-center justify-center gap-6"}>
                <Image
                  src={AWSMarketplaceLogo}
                  alt={"AWS Marketplace"}
                  className={"relative top-[8px]"}
                  height={36}
                />
                <span>
                  <PlusIcon size={16} className={"text-nb-gray-300"} />
                </span>
                <NetBirdLogo size={"large"} mobile={false} />
              </div>

              {isLoading ? (
                <Skeleton
                  width={736}
                  height={484}
                  className={"mt-8 sm:mt-10 flex-1 w-full opacity-50"}
                />
              ) : (
                <Card
                  className={cn(
                    "mt-8 sm:mt-10 p-8 w-full mx-auto",
                    hasActiveStripePlan && "max-w-md",
                  )}
                >
                  <h2
                    className={
                      "text-xl my-0 leading-[1.5] mb-2 text-center w-full"
                    }
                  >
                    Thanks for registering via{" "}
                    <br className={cn(!hasActiveStripePlan && "hidden")} />
                    AWS Marketplace!
                  </h2>
                  <Paragraph
                    className={cn(
                      "text-sm text-center max-w-xl px-4 mb-2 w-full mx-auto",
                    )}
                  >
                    {hasActiveStripePlan ? (
                      <>
                        It seems you already have an active subscription with
                        us. In order to use AWS as a billing provider, please
                        contact our support team.
                      </>
                    ) : (
                      <>
                        With our flexible pricing, you are only billed for
                        active users and active peers through your AWS account.
                        Please choose the plan that fits your needs. <br />
                        You can always change your plan later.
                      </>
                    )}
                  </Paragraph>
                  {!hasActiveStripePlan ? (
                    <div
                      className={
                        "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 w-full mt-6"
                      }
                    >
                      {!plans && (
                        <>
                          <PlanLoadingSkeleton height={378} />
                          <PlanLoadingSkeleton height={378} />
                        </>
                      )}
                      {!isLoading &&
                        teamAndBusinessPlans?.map((plan) => {
                          return (
                            <PlanCard
                              currentSubscription={subscription}
                              plan={plan}
                              buttonText={{
                                upgrade: "Subscribe to",
                                downgrade: "Downgrade to",
                              }}
                              currency={Currency.USD}
                              isSubscribing={isSubscribing}
                              onClick={() => subscribeToPlan(plan)}
                              key={plan.name}
                            />
                          );
                        })}
                    </div>
                  ) : (
                    <div className={"flex gap-4 w-full mt-5"}>
                      <a
                        href={
                          "mailto:support@netbid.io?subject=Request%20for%20Assistance%20-%20AWS%20Marketplace"
                        }
                        className={"w-full"}
                      >
                        <Button variant={"primary"} className={"w-full"}>
                          <MailIcon size={15} className={"shrink-0"} />
                          Get Support
                        </Button>
                      </a>
                      <Button
                        variant={"secondary"}
                        className={"w-full"}
                        onClick={onSuccess}
                      >
                        Continue to Dashboard
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {!hasActiveStripePlan && (
                <button
                  className={
                    "text-nb-gray-400 text-sm flex gap-2 items-center mt-4 justify-center px-3 py-2 hover:text-nb-gray-200 rounded-md transition-all"
                  }
                  tabIndex={-1}
                  onClick={logout}
                >
                  <LogOutIcon size={12} />
                  Logout
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </ModalPortal>
    </Modal>
  );
};

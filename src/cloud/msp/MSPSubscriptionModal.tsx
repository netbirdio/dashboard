import { InlineButtonLink } from "@components/InlineLink";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { CreditCardIcon } from "lucide-react";
import * as React from "react";
import { useTenantPlan } from "@/cloud/msp/hooks/useTenantPlan";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { PlanCard, PlanLoadingSkeleton } from "@/modules/billing/PlanCard";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant: Tenant;
};

export const MSPSubscriptionModal = ({ open, setOpen, tenant }: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <MSPSubscriptionModalContent tenant={tenant} setOpen={setOpen} />
    </Modal>
  );
};

type SubscriptionModalContentProps = {
  tenant: Tenant;
  setOpen: (open: boolean) => void;
};

const MSPSubscriptionModalContent = ({
  tenant,
  setOpen,
}: SubscriptionModalContentProps) => {
  const {
    plans,
    isLoading,
    currentPlan,
    currency,
    isSubscribing,
    subscribe,
    subscription,
  } = useTenantPlan({ tenant });

  return (
    <ModalContent
      maxWidthClass={"max-w-3xl"}
      showClose={false}
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
    >
      <ModalHeader
        icon={<CreditCardIcon size={18} />}
        title={`NetBird Plan for ${tenant.name}`}
        description={"Select the plan that best fits your tenant's needs."}
        color={"netbird"}
      />
      <div className={"px-8 pb-1"}>
        <div className={"grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-4"}>
          {(!plans || isLoading) && (
            <>
              <PlanLoadingSkeleton height={378} />
              <PlanLoadingSkeleton height={378} />
            </>
          )}
          {!isLoading &&
            plans?.map((plan) => {
              return (
                <PlanCard
                  currentPlan={currentPlan}
                  currentSubscription={subscription}
                  plan={plan}
                  currency={currency}
                  isSubscribing={isSubscribing}
                  onClick={() => subscribe(plan).finally(() => setOpen(false))}
                  key={plan.name}
                  buttonText={{
                    upgrade: "Continue with",
                    downgrade: "Downgrade to",
                  }}
                />
              );
            })}
        </div>
        <div className={"pt-6 flex items-center justify-center"}>
          <Paragraph className={"inline text-sm"}>
            Haven’t decided for a plan yet?{" "}
            <ModalClose asChild={true}>
              <InlineButtonLink variant={"white"}>
                Continue with Trial
              </InlineButtonLink>
            </ModalClose>
          </Paragraph>
        </div>
      </div>
    </ModalContent>
  );
};

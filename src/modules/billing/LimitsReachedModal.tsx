import Button from "@components/Button";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useLocalStorage } from "@hooks/useLocalStorage";
import dayjs from "dayjs";
import { MailIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useBilling } from "@/contexts/BillingProvider";

export const LimitsReachedModal = () => {
  const { isFreePlan, usagePercentage, isTrial, isLoading, currentPlan } =
    useBilling();

  const [firstTimeOpen, setFirstTimeOpen] = useLocalStorage<Date | undefined>(
    "netbird-limits-first-open",
    undefined,
  );

  const hasLimitsReached = useMemo(() => {
    if (isTrial === undefined) return false;
    if (currentPlan === undefined) return false;
    if (isLoading) return false;
    return isFreePlan && !isTrial && usagePercentage > 100;
  }, [isFreePlan, isTrial, usagePercentage, isLoading, currentPlan]);

  useEffect(() => {
    if (isTrial) setFirstTimeOpen(undefined);
  }, [isTrial, setFirstTimeOpen]);

  return hasLimitsReached && <LimitReachedContent />;
};

const LimitReachedContent = () => {
  const [open, setOpen] = useState(false);

  const [firstTimeOpen, setFirstTimeOpen] = useLocalStorage<Date | undefined>(
    "netbird-limits-first-open",
    undefined,
  );

  const [lastClose, setLastClose] = useLocalStorage<Date | undefined>(
    "netbird-limits-last-close",
    undefined,
  );

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get("tab");

  const isPlansAndBillingPage = useMemo(() => {
    return pathname === "/settings" && tab === "plans-and-billing";
  }, [pathname, tab]);

  const daysSinceFirstOpen = useMemo(() => {
    if (!firstTimeOpen) return 0;
    return dayjs().diff(dayjs(firstTimeOpen), "day");
  }, [firstTimeOpen]);

  const daysSinceLastClose = useMemo(() => {
    if (!lastClose) return 1;
    return dayjs().diff(dayjs(lastClose), "day");
  }, [lastClose]);

  const canClose = useMemo(() => {
    return daysSinceFirstOpen < 14;
  }, [daysSinceFirstOpen]);

  useEffect(() => {
    if (!firstTimeOpen) setFirstTimeOpen(dayjs().toDate());
    if (!isPlansAndBillingPage && daysSinceFirstOpen >= 14) {
      setOpen(true);
      return;
    }
    if (!isPlansAndBillingPage && daysSinceLastClose >= 1) {
      setOpen(true);
      return;
    }
  }, [firstTimeOpen, isPlansAndBillingPage, daysSinceLastClose]);

  const onOpenChange = (open: boolean) => {
    if (!canClose) return;
    setOpen(open);
    setLastClose(dayjs().toDate());
  };

  const redirectToPlansAndBilling = () => {
    setOpen(false);
    setLastClose(dayjs().toDate());
    router.push("/settings?tab=plans-and-billing");
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent showClose={canClose} maxWidthClass={"max-w-md z-[9999]"}>
        <GradientFadedBackground />
        <div className={"flex items-center justify-center flex-col gap-2 px-8"}>
          <div
            className={
              "bg-nb-gray-900 rounded-lg h-11 w-11 flex items-center justify-center mb-2"
            }
          >
            <NetBirdIcon size={24} className={"shrink-0"} />
          </div>

          <div className={"text-xl font-medium text-center max-w-xs mb-1"}>
            Subscription Limit Reached
          </div>
          <div className={"text-sm text-nb-gray-300 text-center"}>
            It looks like you’ve hit the limit of your current subscription.
            Upgrade now to unlock additional features and increase your limits.
          </div>
        </div>
        <ModalFooter separator={false} className={"gap-x-2 mt-1"}>
          <a
            href={
              "mailto:support@netbird.io?subject=Request%20for%20Assistance%3A%20Account%20Limit%20Reached"
            }
            className={"w-full"}
          >
            <Button className={"w-full"} variant={"secondary"}>
              <MailIcon size={15} className={"shrink-0"} />
              Get Support
            </Button>
          </a>
          <Button
            autoFocus={true}
            className={"w-full"}
            variant={"primary"}
            onClick={redirectToPlansAndBilling}
          >
            {"Upgrade Now"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

import Button from "@components/Button";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import loadConfig from "@utils/config";
import { ClockAlertIcon, LogOutIcon, MailIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { TenantListItem } from "@/cloud/msp/interfaces/Tenant";
import { useBilling } from "@/contexts/BillingProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { PlanTier } from "@/interfaces/Subscription";

const config = loadConfig();

export const MSPTrialExpiredModal = () => {
  const t = useTranslations();
  const { logout } = useLoggedInUser();

  const {
    mspAccount,
    isMspInfoLoading,
    currentAccount,
    isMSPInTenantContext,
    loginAs,
    isAccountWithMSPParent,
    mspInfo,
  } = useMSP();

  const {
    subscription,
    isLoading: isBillingLoading,
    trialDaysRemaining,
  } = useBilling();

  const isTrialExpired = useMemo(() => {
    if (!subscription) return false;
    if (
      subscription.plan_tier === PlanTier.TRIAL ||
      subscription.plan_tier === PlanTier.FREE
    ) {
      return trialDaysRemaining === 0;
    }
    return false;
  }, [subscription, trialDaysRemaining]);

  // Do not show the modal if MSP info and billing is still loading
  if (isMspInfoLoading || isBillingLoading) return;

  // Do not show the modal if there is no tenant context, or no MSP account, or trial is not expired
  if (!isAccountWithMSPParent || !mspAccount || !isTrialExpired) return;

  const mailToEmail =
    mspInfo?.reseller_status === "active"
      ? "support@netbird.io"
      : mspInfo?.parent_owner_email || "support@netbird.io";

  return (
    <Modal open={true} onOpenChange={undefined}>
      <ModalContent showClose={false} maxWidthClass={"max-w-[460px] z-[9999]"}>
        <GradientFadedBackground />
        <div className={"flex items-center justify-center flex-col px-8 gap-3"}>
          <ClockAlertIcon size={24} className={"text-yellow-400"} />
          <div className={"text-xl font-medium"}>
            {isMSPInTenantContext
              ? t("msp.the14DayTrialHasExpired")
              : t("msp.your14DayTrialHasExpired")}
          </div>
          {isMSPInTenantContext ? (
            <div className={"text-sm text-nb-gray-300 text-center"}>
              <TenantName currentAccount={currentAccount} />
              {t("msp.hasReachedTheEndOfTheFreeTrialPeriodTo")}
            </div>
          ) : mspInfo?.reseller_status === "active" ? (
            <div className={"text-sm text-nb-gray-300 text-center"}>
              {t.rich("msp.yourAccountHasReachedTheEndOfTheFreeTrial", {
                part0: () => <br />,
              })}
            </div>
          ) : (
            <div className={"text-sm text-nb-gray-300 text-center"}>
              {t("msp.yourAccountHasReachedTheEndOfTheFreeTrial2")} <MSPName />.
            </div>
          )}
        </div>

        {isMSPInTenantContext ? (
          <ModalFooter separator={false} className={"gap-x-2"}>
            <Button
              autoFocus={true}
              className={"w-auto mx-auto"}
              variant={"secondary"}
              onClick={() => loginAs(undefined)}
            >
              {t.rich("msp.switchTo", {
                part0: () => mspAccount?.name + "'s",
                part1: () => " " + t("common.account"),
              })}
            </Button>
          </ModalFooter>
        ) : (
          <ModalFooter separator={false} className={"gap-x-2"}>
            <Button
              autoFocus={true}
              className={"w-full"}
              variant={"secondary"}
              onClick={logout}
            >
              <LogOutIcon size={15} className={"shrink-0"} />
              {t("settings.logoutLabel")}
            </Button>
            <a
              href={`mailto:${mailToEmail}?subject=Request%20for%20Assistance%3A%20Trial%20Expired`}
              className={"w-full"}
            >
              <Button className={"w-full"} variant={"primary"}>
                <MailIcon size={15} className={"shrink-0"} />
                {t("msp.getSupport")}
              </Button>
            </a>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

const MSPName = () => {
  const { mspContact, mspAccount } = useMSP();
  if (!mspAccount) return "";
  return <span className={"text-nb-gray-100"}>{mspContact}</span>;
};

const TenantName = ({
  currentAccount,
}: {
  currentAccount?: TenantListItem;
}) => {
  if (!currentAccount) return "This tenant ";
  return (
    <span className={"text-nb-gray-100"}>
      {currentAccount?.name} ({currentAccount?.domain}){" "}
    </span>
  );
};

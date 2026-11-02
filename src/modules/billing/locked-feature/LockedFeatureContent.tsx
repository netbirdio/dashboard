import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { LockIcon, MailIcon } from "lucide-react";
import * as React from "react";
import { PlanFeatureAvailability } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { useTrial } from "@/cloud/cloud-hooks/useTrial";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { PlanTier } from "@/interfaces/Subscription";
import { LockedFeatureInfoCardProps } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { TrialOrUpgradeButton } from "@/modules/billing/trial/TrialOrUpgradeButton";

export enum PLAN_TEXT {
  TEAM = "Available on Team",
  BUSINESS = "Available on Business",
  ENTERPRISE = "Available with an Enterprise license",
}

export const LockedFeatureContent = ({
  feature,
  isTooltip = false,
  featureText = "This",
  isCard = false,
  offerTrial = true,
}: LockedFeatureInfoCardProps) => {
  const { isMSPInTenantContext, isAccountWithMSPParent } = useMSP();
  const { isOwnerOrAdmin } = useLoggedInUser();
  const plan = PlanFeatureAvailability[feature];

  return (
    <>
      <div className={"z-10 relative"}>
        <div
          className={cn(
            "flex items-center font-normal mb-1",
            isTooltip ? "text-sm gap-1.5" : "text-base gap-2",
          )}
        >
          <LockIcon
            size={isTooltip ? 12 : 14}
            className={cn("relative", isTooltip && "-top-[1px]")}
          />
            { isNetBirdCloud()? (plan == "team" ? PLAN_TEXT.TEAM : PLAN_TEXT.BUSINESS) : PLAN_TEXT.ENTERPRISE }
        </div>
        <div
          className={cn(
            "text-nb-gray-300 font-light",
            isTooltip ? "text-xs" : "",
          )}
        >
          <AvailableOnPlanText featureText={featureText} plan={plan} />
          {isCard && <br />}
          <UpgradeOrTrialText offerTrial={offerTrial} />
        </div>
      </div>
      {(isOwnerOrAdmin || !isNetBirdCloud()) && (
        <TrialOrUpgradeButton
          plan={plan}
          feature={feature}
          variant={"primary"}
          isCard={isCard}
          isTooltip={isTooltip}
          offerTrial={offerTrial}
          hidden={isAccountWithMSPParent}
        />
      )}
      {isAccountWithMSPParent && !isMSPInTenantContext && (
        <GetMSPSupportButton />
      )}
    </>
  );
};

const AvailableOnPlanText = ({
  featureText,
  plan,
}: {
  featureText: string;
  plan: PlanTier;
}) => {
  const isOrAre = featureText.includes("Posture Checks") ? "are" : "is";
  const teamOrBusiness =
    plan == "team" ? "Team plan or higher. " : "Business plan. ";
  if (!isNetBirdCloud()) {
      return (
      <>
        {featureText} {isOrAre} available with a NetBird Enterprise commercial license, or on NetBird Cloud with the {teamOrBusiness}
      </>
      )
  }

  return (
    <>
      {featureText} {isOrAre} available on the {teamOrBusiness}
    </>
  );
};

const UpgradeOrTrialText = ({
  offerTrial = true,
}: {
  offerTrial?: boolean;
}) => {
  const {
    isMSPInTenantContext,
    isAccountWithMSPParent,
    mspContact,
    hasReseller,
  } = useMSP();
  const { isTrialAvailable } = useTrial();
  const { isOwnerOrAdmin } = useLoggedInUser();

  if (!isNetBirdCloud()) {
    return (
      <>
      </>
    );
  }

  if (hasReseller) {
    return <>Contact your account administrator to upgrade the plan.</>;
  }

  if (isAccountWithMSPParent && !isMSPInTenantContext) {
    return (
      <>
        Contact your account administrator{" "}
        <span className={"text-nb-gray-200 font-medium"}>{mspContact}</span> to
        upgrade the plan.
      </>
    );
  }

  if (!isOwnerOrAdmin)
    return "Only the owner or an admin can upgrade the plan.";

  if (isTrialAvailable && offerTrial)
    return "Upgrade or start a 14-day free trial to access this feature.";

  return `Upgrade your ${
    isMSPInTenantContext ? "tenants" : "current"
  } plan to access this feature.`;
};

const GetMSPSupportButton = () => {
  const { mspInfo, hasReseller } = useMSP();
  const mailToEmail = mspInfo?.parent_owner_email || "support@netbird.io";
  if (hasReseller) return;

  return (
    <div className={"relative top-1 min-w-[160px]"}>
      <a
        href={`mailto:${mailToEmail}?subject=Request%20for%20Assistance%3A%20Upgrade%20Plan`}
        className={"w-full"}
      >
        <Button
          size={"xs"}
          variant={"primary"}
          className={cn("w-full h-[34px]")}
        >
          <MailIcon size={15} className={"shrink-0"} />
          Get Support
        </Button>
      </a>
    </div>
  );
};

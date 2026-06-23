import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { isNetBirdCloud } from "@utils/netbird";
import * as React from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { Hubspot, submitHubspotForm } from "@/cloud/analytics/Hubspot";
import { AWSChoosePlan } from "@/cloud/aws/AWSChoosePlan";
import { AWS_MARKETPLACE_LOCAL_STORAGE_KEY } from "@/cloud/aws/useAWSMarketplace";
import { useDomainCategory } from "@/cloud/cloud-hooks/useDomainCategory";
import HowDidYouHearAboutUs from "@/cloud/survey/HowDidYouHearAboutUs";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { useBilling } from "@/contexts/BillingProvider";
import type { Group } from "@/interfaces/Group";
import { PlanTier } from "@/interfaces/Subscription";
import { OnboardingProvider } from "@/modules/onboarding/OnboardingProvider";

export const NetBirdCloudProvider = () => {
  const { mutate } = useSWRConfig();
  const { subscription } = useBilling();
  const [awsUserId, setAwsUserId] = useState<string | undefined>();
  const { trackEvent, trackEventV2 } = useAnalytics();
  const { domainCategory } = useDomainCategory();
  const awsRequest = useApiCall<Group>(
    "/integrations/billing/aws/marketplace/enrich",
    true,
  ).post;

  useEffect(() => {
    try {
      const id = localStorage.getItem(AWS_MARKETPLACE_LOCAL_STORAGE_KEY);
      if (id) {
        awsRequest({
          aws_user_id: id,
        }).then(() => {
          mutate("/integrations/billing/subscription");
          setAwsUserId(id);
          localStorage.removeItem("netbird-aws-marketplace");
        });
      }
    } catch (e) {}
  }, []);

  const hasFreeOrTrialAWSPlan =
    subscription?.plan_tier === PlanTier.FREE ||
    subscription?.plan_tier === PlanTier.TRIAL;

  const showAWSPlanSelection =
    (hasFreeOrTrialAWSPlan && subscription?.provider === "aws") || awsUserId;

  return (
    <>
      {/* Force user to select an initial plan when coming from AWS Marketplace */}
      {showAWSPlanSelection && (
        <AWSChoosePlan
          onSuccess={() => {
            setAwsUserId(undefined);
          }}
        />
      )}

      {/* Hide onboarding while users selects a plan */}
      {!showAWSPlanSelection && isNetBirdCloud() && (
        <OnboardingProvider
          onSurveySubmit={async (data) => {
            const { fields, hsId, gaId, accountId, userId } = data;
            try {
              await submitHubspotForm({
                id: loadConfig().hubspotOnboardingFormId ?? "",
                fields,
                hubspotQueryId: hsId,
                gaId,
              });
              trackEvent("Onboarding", "onboarding_submit", "Form Submit");
              trackEventV2("Onboarding", "Submitted Form", accountId, userId);
            } catch (error) {}
          }}
          domainCategory={domainCategory}
        />
      )}

      {/* Show survey */}
      <HowDidYouHearAboutUs />

      {/* Hubspot tracking for new accounts */}
      <Hubspot />
    </>
  );
};

import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { isNetBirdCloud } from "@utils/netbird";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Hubspot, submitHubspotForm } from "@/cloud/analytics/Hubspot";
import { AWSChoosePlan } from "@/cloud/aws/AWSChoosePlan";
import { AWS_MARKETPLACE_LOCAL_STORAGE_KEY } from "@/cloud/aws/useAWSMarketplace";
import { useDomainCategory } from "@/cloud/cloud-hooks/useDomainCategory";
import HowDidYouHearAboutUs from "@/cloud/survey/HowDidYouHearAboutUs";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { useBilling } from "@/contexts/BillingProvider";
import {
  AGENT_NETWORK_SIGNUP_SOURCE,
  SIGNUP_SOURCE_LOCAL_STORAGE_KEY,
} from "@/hooks/useSignupSource";
import type { Account } from "@/interfaces/Account";
import type { Group } from "@/interfaces/Group";
import { PlanTier } from "@/interfaces/Subscription";
import { useAccount } from "@/modules/account/useAccount";
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
  const account = useAccount();
  const accountRequest = useApiCall<Account>("/accounts", true).put;
  const signupSourceApplied = useRef(false);

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

  // Apply the netbird.ai signup source once the account is available. New
  // accounts (signup form still pending) get the focused view
  // (agent_network_only); existing accounts just get the Agent Network menu
  // made available (dashboard_features.agent_network), leaving the rest of
  // their dashboard intact.
  useEffect(() => {
    if (!account || signupSourceApplied.current) return;
    try {
      const source = localStorage.getItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY);
      if (source !== AGENT_NETWORK_SIGNUP_SOURCE) return;

      const isNewAccount = account.onboarding?.signup_form_pending === true;
      const alreadyApplied = isNewAccount
        ? account.settings?.agent_network_only === true
        : account.settings?.dashboard_features?.agent_network === true;

      if (alreadyApplied) {
        localStorage.removeItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY);
        return;
      }

      signupSourceApplied.current = true;
      // Always enable the Agent Network menu (dashboard_features). New accounts
      // additionally get the focused view (agent_network_only). Keeping the
      // menu flag set means that if a focused account later turns the focused
      // view off, it keeps access to Agent Network rather than losing the menu.
      const settings = {
        ...account.settings,
        dashboard_features: {
          ...account.settings?.dashboard_features,
          agent_network: true,
        },
        ...(isNewAccount ? { agent_network_only: true } : {}),
      };
      notify({
        title: "Agent Network",
        description: isNewAccount
          ? "Agent Network focused view enabled for your account."
          : "Agent Network enabled for your account.",
        promise: accountRequest(
          { id: account.id, settings },
          "/" + account.id,
        ).then(async () => {
          // Revalidate before clearing the source key so the persisted
          // setting is in cache first. Clearing it earlier would leave a
          // window where neither the source-pending optimism nor the stored
          // setting holds, briefly flipping the focused view off and closing
          // the onboarding form as the toast appears.
          await mutate("/accounts");
          localStorage.removeItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY);
        }),
        loadingMessage: isNewAccount
          ? "Enabling Agent Network focused view..."
          : "Enabling Agent Network...",
      });
    } catch (e) {}
  }, [account]);

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

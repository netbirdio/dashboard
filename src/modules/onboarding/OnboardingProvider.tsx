import { useLocalStorage } from "@hooks/useLocalStorage";
import useFetchApi, { useApiCall } from "@utils/api";
import {
  isLocalDev,
  isNetBirdCloud,
  testOnboardingEnabled,
} from "@utils/netbird";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { submitHubspotForm } from "@/cloud/analytics/Hubspot";
import { HubspotFormField, useAnalytics } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Account } from "@/interfaces/Account";
import { Network } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import {
  AGENT_NETWORK_SIGNUP_SOURCE,
  SIGNUP_SOURCE_LOCAL_STORAGE_KEY,
} from "@/hooks/useSignupSource";
import { useAccount } from "@/modules/account/useAccount";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { AgentNetworkOnboarding } from "@/modules/onboarding/agent-network/AgentNetworkOnboarding";
import {
  Intent,
  Onboarding,
  OnboardingState,
} from "@/modules/onboarding/Onboarding";

// hasAgentNetworkSignupSource reads the netbird.ai signup source captured
// before authentication. It is available synchronously from the first render,
// so the onboarding can commit to the Agent Network form immediately instead
// of briefly showing the regular form while the account/mode data settles.
const hasAgentNetworkSignupSource = () => {
  try {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY) ===
        AGENT_NETWORK_SIGNUP_SOURCE
    );
  } catch (e) {
    return false;
  }
};

type Props = {
  onSurveySubmit?: (data: {
    fields: HubspotFormField[];
    hsId: string;
    gaId: string;
    accountId?: string;
    userId?: string;
  }) => void;
  domainCategory?: string;
};

export const OnboardingProvider = ({
  onSurveySubmit,
  domainCategory,
}: Props) => {
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const accountRequest = useApiCall<Account>("/accounts", true);
  const account = useAccount();
  const router = useRouter();
  const { isOwner, loggedInUser } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const { trackEventV2 } = useAnalytics();
  const params = useSearchParams();
  const hsId = params?.get("hs_id") ?? "";
  const gaId = params?.get("ga_id") ?? "";
  const { only: agentNetworkOnly, loading: agentNetworkModeLoading } =
    useAgentNetworkMode();

  const accountId = account?.id ?? "unknown";
  const onboardingKey = `netbird-onboarding-flow:${accountId}`;

  // Migrate old onboarding state to new key if needed
  if (typeof window !== "undefined" && account?.id) {
    const oldKey = "netbird-onboarding-flow";
    const oldValue = window.localStorage.getItem(oldKey);
    const newValue = window.localStorage.getItem(onboardingKey);
    if (oldValue && !newValue) {
      window.localStorage.setItem(onboardingKey, oldValue);
      window.localStorage.removeItem(oldKey);
    }
  }

  const [onboarding, setOnboarding] = useLocalStorage<OnboardingState>(
    onboardingKey,
    {
      intent: Intent.P2P,
      step: 1,
    },
  );

  // A netbird.ai arrival commits to the Agent Network onboarding regardless of
  // when the account setting is persisted; the signup source is known
  // synchronously, so the regular form is never shown for these users.
  const agentNetworkOnboarding =
    agentNetworkOnly || hasAgentNetworkSignupSource();

  const showOnboarding = useMemo(() => {
    if (process.env.APP_ENV === "test" && !testOnboardingEnabled()) {
      return false;
    }
    if (!account) return false;
    // The Agent Network onboarding runs a dedicated flow whose first step is
    // the signup form. Unlike the regular cloud survey (which relies on a JWT
    // domain claim), this form is shown on both cloud and self-hosted, so the
    // flow stays visible while either the signup form or the onboarding flow
    // is still pending.
    if (agentNetworkOnboarding) {
      const signupPending = !!account?.onboarding?.signup_form_pending;
      return (
        isOwner &&
        (signupPending || !!account?.onboarding?.onboarding_flow_pending)
      );
    }
    // For everyone else, wait until the Agent Network mode has resolved before
    // deciding, so a slow mode fetch can't briefly show the regular form to an
    // account that turns out to be Agent Network-only via config.
    if (agentNetworkModeLoading) return false;
    if (!isNetBirdCloud()) return false;
    const isSignupFormPending = isNetBirdCloud()
      ? !!account?.onboarding?.signup_form_pending
      : false;
    const show =
      !!account?.onboarding?.onboarding_flow_pending || isSignupFormPending;
    return isOwner && show;
  }, [account, isOwner, agentNetworkOnboarding, agentNetworkModeLoading]);

  // The agent-network flow uses its own signup step on both cloud and
  // self-hosted, so netbird.ai signups fill the form before onboarding.
  const agentSignupPending = !!account?.onboarding?.signup_form_pending;

  const updateAccountMeta = async (meta: Partial<Account["onboarding"]>) => {
    if (!account) return;
    await accountRequest
      .put(
        {
          ...account,
          id: account.id,
          onboarding: {
            ...account.onboarding,
            ...meta,
          },
        },
        `/${account.id}`,
      )
      .then(() => mutate("/accounts"));
  };

  const onSkip = async (intent: Intent, step: number) => {
    await updateAccountMeta({
      onboarding_flow_pending: false,
    });
    trackEventV2(
      "Onboarding",
      `Skipped Onboarding - ${intent} (Step ${step})`,
      account?.id,
      loggedInUser?.id,
    );
  };

  const onFinish = async (n?: Network) => {
    await updateAccountMeta({
      onboarding_flow_pending: false,
    });
    trackEventV2(
      "Onboarding",
      "Finished Onboarding",
      account?.id,
      loggedInUser?.id,
    );
    if (n) {
      // router.push(`/network?id=${n.id}`);
      router.push("/control-center?tab=networks");
    } else {
      router.push("/control-center");
    }
  };

  const onFinishAgentNetwork = async () => {
    await updateAccountMeta({
      onboarding_flow_pending: false,
    });
    trackEventV2(
      "Onboarding",
      "Finished Agent Network Onboarding",
      account?.id,
      loggedInUser?.id,
    );
    router.push("/agent-network/usage?tab=access-logs");
  };

  const onSubmitAgentSignup = async (fields: HubspotFormField[]) => {
    await updateAccountMeta({
      signup_form_pending: false,
    });
    trackEventV2(
      "Onboarding",
      "Submitted Agent Network Signup",
      account?.id,
      loggedInUser?.id,
    );
    if (isLocalDev()) return;
    try {
      await submitHubspotForm({
        // Dedicated HubSpot form for the self-hosted Agent Network signup, and
        // NetBird's portal id — hardcoded so the submission works without the
        // operator configuring NETBIRD_HUBSPOT_PORTAL_ID on their deployment.
        id: "f387844f-8752-489e-a7b3-4ded545a2f2f",
        portalId: "144571599",
        fields,
        hubspotQueryId: hsId,
        gaId,
      });
    } catch (e) {}
  };

  const onSkipAgentNetwork = async (step: number) => {
    await updateAccountMeta({
      onboarding_flow_pending: false,
    });
    trackEventV2(
      "Onboarding",
      `Skipped Agent Network Onboarding (Step ${step})`,
      account?.id,
      loggedInUser?.id,
    );
  };

  const onTroubleshootingClick = (intent: Intent) => {
    trackEventV2(
      "Onboarding",
      `Troubleshooting - ${intent}`,
      account?.id,
      loggedInUser?.id,
    );
  };

  const submitSurvey = async (fields: HubspotFormField[]) => {
    await updateAccountMeta({
      signup_form_pending: false,
    });
    if (isLocalDev()) return;
    onSurveySubmit?.({
      fields,
      hsId,
      gaId,
      accountId: account?.id,
      userId: loggedInUser?.id,
    });
  };

  const formSubmitted = isNetBirdCloud()
    ? !account?.onboarding?.signup_form_pending
    : true;

  if (showOnboarding && agentNetworkOnboarding) {
    return (
      <AgentNetworkOnboarding
        initialStep={onboarding.step}
        onStepChange={(step) => setOnboarding((prev) => ({ ...prev, step }))}
        signupPending={agentSignupPending}
        onSignupSubmit={onSubmitAgentSignup}
        onSkip={onSkipAgentNetwork}
        onFinish={onFinishAgentNetwork}
      />
    );
  }

  return (
    <>
      {showOnboarding && peers && (
        <Onboarding
          formSubmitted={formSubmitted}
          isOnboardingPending={!!account?.onboarding?.onboarding_flow_pending}
          initial={onboarding}
          setLocalOnboarding={setOnboarding}
          peers={peers}
          onSurveySubmit={submitSurvey}
          onTroubleshootingClick={onTroubleshootingClick}
          onSkip={onSkip}
          onFinish={onFinish}
          domainCategory={domainCategory}
        />
      )}
    </>
  );
};

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
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  AGENT_NETWORK_SIGNUP_SOURCE,
  SIGNUP_SOURCE_LOCAL_STORAGE_KEY,
} from "@/hooks/useSignupSource";
import { Account } from "@/interfaces/Account";
import { Network } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import { useAccount } from "@/modules/account/useAccount";
import { useAgentNetworkSettings } from "@/modules/agent-network/AIProvidersProvider";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { AgentNetworkOnboarding } from "@/modules/onboarding/agent-network/AgentNetworkOnboarding";
import { storedAgentStep } from "@/modules/onboarding/agent-network/agentNetworkSteps";
import {
  clearAgentNetworkOnboardingRequest,
  useAgentNetworkOnboardingRequest,
  useOnboardingRequest,
} from "@/modules/onboarding/agent-network/existingAccountOnboarding";
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
  const { permission } = usePermissions();
  // Onboarding only cares whether the account has peers yet. Roles without
  // peers read (agent_network_admin, usage_viewer) would just collect a 403
  // toast on every page, so skip the call for them entirely.
  const { data: peers } = useFetchApi<Peer[]>(
    "/peers",
    true,
    true,
    permission.peers.read,
  );
  const accountRequest = useApiCall<Account>("/accounts", true);
  const account = useAccount();
  const router = useRouter();
  const { isOwner, isOwnerOrAdmin, loggedInUser } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const { trackEventV2 } = useAnalytics();
  const params = useSearchParams();
  const hsId = params?.get("hs_id") ?? "";
  const gaId = params?.get("ga_id") ?? "";
  const {
    only: agentNetworkOnly,
    enabled: agentNetworkEnabled,
    loading: agentNetworkModeLoading,
  } = useAgentNetworkMode();

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

  // An existing account asks for the Agent Network onboarding through the
  // netbird.ai link (see NetBirdCloudProvider). It opens for an owner or admin
  // on Cloud once the Agent Network menu is saved, unless the account already
  // has an Agent Network endpoint; once open, it runs until finished or
  // skipped.
  const requestMarker = useAgentNetworkOnboardingRequest(account?.id);
  const {
    settings: agentNetworkSettings,
    isLoading: agentNetworkSettingsLoading,
  } = useAgentNetworkSettings(requestMarker === "requested");
  const request = useOnboardingRequest(account?.id, {
    marker: requestMarker,
    cloud: isNetBirdCloud(),
    ownerOrAdmin: loggedInUser ? isOwnerOrAdmin : undefined,
    agentNetworkEnabled,
    settingsLoading: agentNetworkSettingsLoading,
    hasEndpoint: !!agentNetworkSettings?.endpoint,
  });
  const existingAccountRequest = request === "open";

  // A netbird.ai arrival commits to the Agent Network onboarding regardless of
  // when the account setting is persisted; the signup source is known
  // synchronously, so the regular form is never shown for these users.
  const agentNetworkOnboarding =
    agentNetworkOnly || hasAgentNetworkSignupSource() || existingAccountRequest;

  const showOnboarding = useMemo(() => {
    if (process.env.APP_ENV === "test" && !testOnboardingEnabled()) {
      return false;
    }
    if (!account) return false;
    // An existing account's request is still resolving; neither onboarding
    // opens in the meantime.
    if (request === "wait") return false;
    // The Agent Network onboarding runs a dedicated flow whose first step is
    // the signup form. Unlike the regular cloud survey (which relies on a JWT
    // domain claim), this form is shown on both cloud and self-hosted, so the
    // flow stays visible while either the signup form or the onboarding flow
    // is still pending.
    if (agentNetworkOnboarding) {
      // The request was checked when it was resolved, admins included.
      if (existingAccountRequest) return true;
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
    // The regular flow shows on both cloud and self-hosted, but the signup
    // survey relies on a JWT domain claim self-hosted IdPs don't emit, so it
    // only counts toward showing (and is only rendered) on cloud — self-hosted
    // starts directly at the intent step.
    const isSignupFormPending = isNetBirdCloud()
      ? !!account?.onboarding?.signup_form_pending
      : false;
    const show =
      !!account?.onboarding?.onboarding_flow_pending || isSignupFormPending;
    return isOwner && show;
  }, [
    account,
    isOwner,
    request,
    agentNetworkOnboarding,
    existingAccountRequest,
    agentNetworkModeLoading,
  ]);

  // The agent-network flow uses its own signup step on both cloud and
  // self-hosted, so netbird.ai signups fill the form before onboarding.
  const agentSignupPending = !!account?.onboarding?.signup_form_pending;

  // The gateway step offers a NetBird-managed gateway, which only exists on
  // Cloud. showOnboarding limits the flow to the owner's own signup, or to an
  // owner or admin whose existing account asked for it. This also covers a
  // return after the signup source was cleared: the account is still
  // onboarding.
  const gatewayStep =
    isNetBirdCloud() && showOnboarding && agentNetworkOnboarding;

  // On Cloud a netbird.ai signup is switched to the focused view, so an
  // Agent Network onboarding outside it, past the signup form, belongs to an
  // account that existed before. Such an account keeps its groups and policies
  // and its saved position, which is the regular onboarding's.
  const existingAccount =
    existingAccountRequest ||
    (isNetBirdCloud() && !agentNetworkOnly && !agentSignupPending);

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

  // Finishing or skipping ends an existing account's request as well. It is
  // cleared after the account write, so the regular onboarding it was also
  // pending never flashes in between.
  const endAgentNetworkOnboarding = async () => {
    try {
      await updateAccountMeta({
        onboarding_flow_pending: false,
      });
    } finally {
      if (account?.id) clearAgentNetworkOnboardingRequest(account.id);
    }
  };

  const onFinishAgentNetwork = async () => {
    await endAgentNetworkOnboarding();
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
    await endAgentNetworkOnboarding();
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
        initialStep={storedAgentStep(onboarding, !existingAccount)}
        onStepChange={(step) =>
          setOnboarding((prev) => ({ ...prev, agent_network_step: step }))
        }
        gatewayStep={gatewayStep}
        existingAccount={existingAccount}
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

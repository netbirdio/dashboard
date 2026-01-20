import { useLocalStorage } from "@hooks/useLocalStorage";
import useFetchApi, { useApiCall } from "@utils/api";
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { HubspotFormField, useAnalytics } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Account } from "@/interfaces/Account";
import { Network } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import { useAccount } from "@/modules/account/useAccount";
import {
  Intent,
  Onboarding,
  OnboardingState,
} from "@/modules/onboarding/Onboarding";

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

  const showOnboarding = useMemo(() => {
    if (process.env.APP_ENV === "test") return false;
    if (!account) return false;
    const isSignupFormPending = isNetBirdHosted()
      ? !!account?.onboarding?.signup_form_pending
      : false;
    const show =
      !!account?.onboarding?.onboarding_flow_pending || isSignupFormPending;
    return isOwner && show;
  }, [account, isOwner]);

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

  const formSubmitted = isNetBirdHosted()
    ? !account?.onboarding?.signup_form_pending
    : true;

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

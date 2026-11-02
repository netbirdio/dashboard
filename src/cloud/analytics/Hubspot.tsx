import { useOidcUser } from "@axa-fr/react-oidc";
import { useLocalStorage } from "@hooks/useLocalStorage";
import loadConfig from "@utils/config";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { HubspotFormField, useAnalytics } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useAccount } from "@/modules/account/useAccount";

const config = loadConfig();

const detectDeviceType = () => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent.toLowerCase();
  const isTablet =
    /tablet|ipad|playbook|silk/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua));
  if (isTablet) {
    return "tablet";
  }

  const isMobile =
    /mobi|iphone|ipod|blackberry|phone/.test(ua) ||
    (/android/.test(ua) && /mobile/.test(ua));
  if (isMobile) {
    return "mobile";
  }

  return "desktop";
};

export const Hubspot = () => {
  const { loggedInUser, isOwner } = useLoggedInUser();
  const { oidcUser } = useOidcUser();
  const account = useAccount();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [deviceType, setDeviceType] = useState("unknown");
  const utmSource = params?.get("utm_source") ?? "";
  const utmMedium = params?.get("utm_medium") ?? "";
  const utmContent = params?.get("utm_content") ?? "";
  const utmCampaign = params?.get("utm_campaign") ?? "";
  const hsId = params?.get("hs_id") ?? "";
  const gaId = params?.get("ga_id") ?? "";

  // Submit form only when localStorage key is false
  const [submittedSignUpForm, setSubmittedSignUpForm] = useLocalStorage(
    "netbird-signup-form",
    false,
  );

  useEffect(() => {
    setMounted(true);
    setDeviceType(detectDeviceType());
  }, []);

  const isNewAccount = useMemo(() => {
    try {
      return (
        account?.created_at &&
        dayjs(account?.created_at).isAfter(dayjs().subtract(10, "minute"))
      );
    } catch (e) {
      return false;
    }
  }, [account]);

  return (
    account &&
    loggedInUser &&
    isOwner &&
    !submittedSignUpForm &&
    isNewAccount &&
    mounted &&
    config.hubspotSignupFormId && (
      <HubspotForm
        onSuccess={() => setSubmittedSignUpForm(true)}
        id={config.hubspotSignupFormId}
        hubspotQueryId={hsId}
        gaId={gaId}
        fields={[
          {
            name: "email",
            value: oidcUser?.email || loggedInUser?.email || "",
          },
          {
            name: "firstname",
            value:
              oidcUser?.given_name ||
              oidcUser?.name ||
              loggedInUser?.name ||
              "",
          },
          {
            name: "lastname",
            value: oidcUser?.family_name || "",
          },
          {
            name: "utm_source",
            value: utmSource,
          },
          {
            name: "utm_medium",
            value: utmMedium,
          },
          {
            name: "utm_content",
            value: utmContent,
          },
          {
            name: "utm_campaign",
            value: utmCampaign,
          },
          {
            name: "account_id",
            value: account?.id,
          },
          {
            name: "is_owner",
            value: "true",
          },
          {
            name: "device_type",
            value: deviceType,
          },
        ]}
      />
    )
  );
};

type FormProps = {
  id: string;
  fields: HubspotFormField[];
  onSuccess?: () => void;
  hubspotQueryId?: string;
  gaId?: string;
  // portalId overrides config.hubspotPortalId for callers that target a fixed
  // HubSpot portal regardless of the deployment's env (e.g. the self-hosted
  // Agent Network signup, which always reports to NetBird's portal).
  portalId?: string;
};

export const HubspotForm = ({
  id,
  fields,
  onSuccess,
  hubspotQueryId,
  gaId,
}: FormProps) => {
  const { trackGTMCustomEvent, trackEvent } = useAnalytics();

  useEffect(() => {
    const submit = async () => {
      try {
        trackGTMCustomEvent("Lead");
        trackGTMCustomEvent("New Sign-up");
        trackEvent("New Sign-up", "New Sign-up", "New Sign-up");
        return await submitHubspotForm({ id, fields, hubspotQueryId, gaId });
      } catch (error) {}
    };

    // Wait before submitting the form (getting hubspot id from cookie takes some time while hubspot is initializing)
    setTimeout(() => submit().then(() => onSuccess?.()), 3500);
  }, []);

  return null;
};

export const submitHubspotForm = async ({
  id,
  fields,
  hubspotQueryId,
  gaId,
  portalId,
}: FormProps) => {
  try {
    const resolvedPortalId = portalId || config.hubspotPortalId;
    if (!resolvedPortalId || !id) return;

    // Do not submit forms for excluded accounts, e.g., synthetic test users
    const email = fields?.find((field) => field?.name === "email")?.value;
    if (email && config.analyticsExcludedEmails?.includes(email)) {
      return;
    }

    return fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${resolvedPortalId}/${id}`,
      {
      method: "POST",
      body: JSON.stringify({
        submittedAt: dayjs().valueOf(),
        fields: [
          ...fields,
          { name: "gaid", value: gaId || Cookies.get("_ga") || "" },
        ],
        context: {
          hutk: Cookies.get("hubspotutk") || hubspotQueryId || undefined,
          pageName: document?.title || "",
          pageUri: window?.location?.href,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  } catch (error) {}
};

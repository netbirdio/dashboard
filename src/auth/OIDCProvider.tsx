"use client";

import {
  AuthorityConfiguration,
  OidcConfiguration,
  OidcProvider,
} from "@axa-fr/react-oidc";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useLocalStorage } from "@hooks/useLocalStorage";
import { useRedirect } from "@hooks/useRedirect";
import loadConfig, { buildExtras } from "@utils/config";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { OIDCError } from "@/auth/OIDCError";
import { SecureProvider } from "@/auth/SecureProvider";

type Props = {
  children: React.ReactNode;
};

const config = loadConfig();

/**
 * Unfortunately Auth0 https://<DOMAIN>/.well-known/openid-configuration doesn't contain end_session_endpoint that
 * is required for doing logout. Therefore, we need to hardcode the config for auth
 */
const auth0AuthorityConfig: AuthorityConfiguration = {
  authorization_endpoint: new URL("authorize", config.authority).href,
  token_endpoint: new URL("oauth/token", config.authority).href,
  revocation_endpoint: new URL("oauth/revoke", config.authority).href,
  end_session_endpoint: new URL("v2/logout", config.authority).href,
  userinfo_endpoint: new URL("userinfo", config.authority).href,
  issuer: new URL("", config.authority).href,
};

const onEvent = (configurationName: any, eventName: any, data: any) => {
  if (process.env.NODE_ENV !== "production") {
    //console.info(`oidc:${configurationName}:${eventName}`, data);
  }
};

export default function OIDCProvider({ children }: Props) {
  const [providerConfig, setProviderConfig] = useState<OidcConfiguration>();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams()?.toString();
  const [, setQueryParams] = useLocalStorage("netbird-query-params", params);

  useEffect(() => {
    const validParams = [
      "tab",
      "search",
      "id",
      "invite",
      "utm_source",
      "utm_medium",
      "utm_content",
      "utm_campaign",
      "hs_id",
      "page",
      "page_size",
      "user",
      "port",
    ];

    try {
      const urlParams = new URLSearchParams(params);
      if (validParams.some((param) => urlParams.has(param))) {
        setQueryParams(params);
      }
    } catch (e) {}
  }, []);

  const withCustomHistory = () => {
    return {
      replaceState: (url: any) => {
        router.replace(url);
        window.dispatchEvent(new Event("popstate"));
      },
    };
  };

  useEffect(() => {
    setProviderConfig({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: window.location.origin + config.redirectURI,
      refresh_time_before_tokens_expiration_in_second: 30,
      silent_redirect_uri: window.location.origin + config.silentRedirectURI,
      scope: config.scopesSupported,
      // disabling service worker
      //service_worker_relative_url: "/OidcServiceWorker.js",
      service_worker_only: false,
      authority_configuration: config.auth0Auth
        ? auth0AuthorityConfig
        : undefined,
      extras: buildExtras(),
      ...(config.clientSecret
        ? { token_request_extras: { client_secret: config.clientSecret } }
        : null),
    });
    setMounted(true);
  }, []);

  // We bypass authentication for pages that do not require auth.
  // E.g., when we just want to show installation steps for public.
  // Or the instance setup wizard for first-time setup.
  if (path === "/install" || path === "/setup") return children;

  return mounted && providerConfig ? (
    <OidcProvider
      configuration={providerConfig}
      //withCustomHistory={withCustomHistory}
      authenticatingComponent={FullScreenLoading}
      authenticatingErrorComponent={OIDCError}
      loadingComponent={FullScreenLoading}
      callbackSuccessComponent={CallBackSuccess}
      onEvent={onEvent}
      onSessionLost={() => void 0}
      //sessionLostComponent={SessionLost}
    >
      <SecureProvider>{children}</SecureProvider>
    </OidcProvider>
  ) : (
    <FullScreenLoading />
  );
}

const CallBackSuccess = () => {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const currentPath = usePathname();
  useRedirect(currentPath, true, !errorParam);
  return <FullScreenLoading />;
};

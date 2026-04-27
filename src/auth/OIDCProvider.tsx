"use client";

import {
  AuthorityConfiguration,
  OidcConfiguration,
  OidcProvider,
} from "@axa-fr/react-oidc";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import loadConfig, { buildExtras } from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
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

  const withCustomHistory = () => {
    return {
      replaceState: (url: any) => {
        window?.location?.replace(url);
      },
    };
  };

  useEffect(() => {
    // The service worker is disabled in two cases:
    //  1. tokenSource === "idtoken" — the SW would overwrite the manually-set
    //     idToken header with the access_token, breaking the idToken path.
    //  2. NETBIRD_DISABLE_SERVICE_WORKER=true — operator escape hatch for
    //     debugging or deployments that hit edge cases with the SW.
    const useServiceWorker =
      !config.disableServiceWorker &&
      config.tokenSource?.toLowerCase() !== "idtoken";

    setProviderConfig({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: window.location.origin + config.redirectURI,
      refresh_time_before_tokens_expiration_in_second: 30,
      silent_redirect_uri: window.location.origin + config.silentRedirectURI,
      scope: config.scopesSupported,
      ...(useServiceWorker
        ? {
            service_worker_relative_url: "/OidcServiceWorker.js",
            service_worker_only: false,
          }
        : {}),
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
  // Or the invite acceptance page for new users.
  if (path === "/install" || path === "/setup" || path?.startsWith("/invite"))
    return children;

  return mounted && providerConfig ? (
    <OidcProvider
      configuration={providerConfig}
      withCustomHistory={withCustomHistory}
      authenticatingComponent={FullScreenLoading}
      authenticatingErrorComponent={OIDCError}
      loadingComponent={FullScreenLoading}
      callbackSuccessComponent={FullScreenLoading}
      onEvent={onEvent}
      // If session is lost, try to re-initiate authentication flow
      onSessionLost={() => window.location.replace("/")}
      // Another tab logged out — fires a separate event in @axa-fr/react-oidc,
      // not covered by onSessionLost. Without this handler the library would
      // render its default "Session timed out" UI instead of redirecting.
      onLogoutFromAnotherTab={() => window.location.replace("/")}
      // sessionLostComponent={SessionLost}
    >
      <SecureProvider>{children}</SecureProvider>
    </OidcProvider>
  ) : (
    <FullScreenLoading />
  );
}

import { useOidcUser } from "@axa-fr/react-oidc";
import useFetchApi from "@utils/api";
import loadConfig from "@utils/config";
import { useMemo } from "react";
import { SSOConnection } from "@/interfaces/IdentityProvider";

const config = loadConfig();

export const useSSOConnections = () => {
  const { oidcUser } = useOidcUser();
  const { data: ssos, isLoading: isSSOLoading } = useFetchApi<SSOConnection[]>(
    "/service/idp/sso",
    true,
    false,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
      shouldRetryOnError: false,
    },
  );

  const jumpCloudConnection = useMemo(() => {
    return ssos?.find((sso) => sso.provider === "jumpcloud");
  }, [ssos]);

  const genericConnection = useMemo(() => {
    return ssos?.[0];
  }, [ssos]);

  const entraConnection = useMemo(() => {
    const sub = oidcUser?.sub;
    const isEntra = sub?.includes("oauth2|azure-oauth2");
    return isEntra
      ? ({
          strategy: "oauth2",
          name: "azure-oauth2",
          id: "none",
          provider: "azure-oauth2",
        } as SSOConnection)
      : undefined;
  }, [oidcUser]);

  return {
    jumpCloudConnection,
    genericConnection,
    entraConnection,
    isSSOLoading,
  };
};

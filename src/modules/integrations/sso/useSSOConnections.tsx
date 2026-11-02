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
    // Exclude connections derived from user profile
    return ssos?.find((sso) => sso.id !== "none");
  }, [ssos]);

  const entraConnection = useMemo(() => {
    const entraConnection = ssos?.find((sso) => sso.name === "azure-oauth2");
    if (entraConnection) return entraConnection;

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
  }, [ssos, oidcUser]);

  return {
    jumpCloudConnection,
    genericConnection,
    entraConnection,
    isSSOLoading,
  };
};

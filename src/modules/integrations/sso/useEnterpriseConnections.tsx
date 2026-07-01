import useFetchApi, { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { useMemo } from "react";
import {
  DomainValidationStatus,
  EnterpriseConnection,
} from "@/interfaces/IdentityProvider";

const config = loadConfig();

interface EnterpriseConnectionRequest {
  discovery_url?: string;
  domain?: string;
  client_id: string;
  client_secret: string;
  strategy: "okta" | "oidc";
  provider?: "okta" | "jumpcloud" | "keycloak";
  email_domain: string;
  connection_id?: string;
  enabled?: boolean;
}

export const useEnterpriseConnections = () => {
  const {
    data: connections,
    isLoading: isDataLoading,
    error,
    mutate,
  } = useFetchApi<EnterpriseConnection[]>(
    "/service/idp",
    true,
    false,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
    },
  );
  const request = useApiCall<EnterpriseConnection[]>("/service/idp", true, {
    origin: config.authServiceUrl,
  });

  const oktaConnection = useMemo(
    () => connections?.find((connection) => connection.strategy === "okta"),
    [connections],
  );

  const isOktaConnectionActive = useMemo(() => {
    let isEnabled = !!oktaConnection?.enabled;
    let hasActiveDomains = oktaConnection?.domains.some(
      (domain) => domain.validation_status === DomainValidationStatus.VERIFIED,
    );
    return isEnabled && hasActiveDomains;
  }, [oktaConnection]);

  const createOrUpdateConnection = async (
    data: EnterpriseConnectionRequest,
  ) => {
    return request.post(data, "");
  };

  const deleteConnection = async (connectionId: string) => {
    return request.del({}, `/${connectionId}`);
  };

  const addDomain = async (connectionId: string, domain: string) => {
    return request.post({ domain }, `/domain/${connectionId}`);
  };

  const deleteDomain = async (connectionId: string, domain: string) => {
    return request.del({ domain }, `/domain/${connectionId}`);
  };

  const verifyDomain = async (connectionId: string, domain: string) => {
    return request.post({ domain }, `/domain/${connectionId}/verify`);
  };

  const toggleConnection = async (connectionId: string) => {
    return request.get(`/${connectionId}/toggle`);
  };

  return {
    connections,
    isDataLoading,
    error,
    mutate,
    oktaConnection,
    createOrUpdateConnection,
    deleteConnection,
    addDomain,
    verifyDomain,
    deleteDomain,
    toggleConnection,
    isOktaConnectionActive,
  };
};

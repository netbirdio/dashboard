import useFetchApi, { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { useCallback } from "react";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";

const config = loadConfig();

export const useSignInDomains = (pollWhilePendingMs?: number) => {
  const refreshInterval = useCallback(
    (latest?: SignInDomain[]) =>
      pollWhilePendingMs &&
      latest?.some(
        (domain) => domain.validation_status === DomainValidationStatus.PENDING,
      )
        ? pollWhilePendingMs
        : 0,
    [pollWhilePendingMs],
  );

  const {
    data: domains,
    isLoading,
    error,
    mutate,
  } = useFetchApi<SignInDomain[]>(
    "/service/sign-in-domains",
    true,
    true,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
      refreshInterval,
      shouldRetryOnError: false,
    },
  );

  const request = useApiCall<SignInDomain>("/service/sign-in-domains", true, {
    origin: config.authServiceUrl,
  });

  const addDomain = async (domain: string) => {
    return request.post({ domain });
  };

  const verifyDomain = async (domainId: string) => {
    return request.post({}, `/${domainId}/verify`);
  };

  const deleteDomain = async (domainId: string) => {
    return request.del({}, `/${domainId}`);
  };

  const isUnavailable = !!error || (!isLoading && !domains);

  return {
    domains,
    isLoading,
    isUnavailable,
    error,
    mutate,
    addDomain,
    verifyDomain,
    deleteDomain,
  } as const;
};

import useFetchApi, { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { SignInDomain } from "@/interfaces/Account";

const config = loadConfig();

// Polling is a fixed interval rather than one derived from whether any domain
// is still pending: the shared RequestOptions types refreshInterval as a plain
// number, so SWR's data-dependent form is not available without widening it for
// every consumer. SWR skips the poll while the document is hidden, and the tab
// unmounts when the user navigates away, so it only runs while someone watches.
export const useSignInDomains = (refreshInterval?: number) => {
  const {
    data: domains,
    isLoading,
    error,
    mutate,
  } = useFetchApi<SignInDomain[]>(
    "/service/account/domains",
    true,
    true,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
      refreshInterval,
    },
  );

  const request = useApiCall<SignInDomain>("/service/account/domains", true, {
    origin: config.authServiceUrl,
  });

  const addDomain = async (domain: string) => {
    return request.post({ domain });
  };

  // Verification only kicks off the DNS lookup; the service polls with a
  // backoff, so the status keeps changing after this resolves.
  const verifyDomain = async (domainId: string) => {
    return request.post({}, `/${domainId}/verify`);
  };

  const deleteDomain = async (domainId: string) => {
    return request.del({}, `/${domainId}`);
  };

  return {
    domains,
    isLoading,
    error,
    mutate,
    addDomain,
    verifyDomain,
    deleteDomain,
  } as const;
};

import useFetchApi from "@utils/api";
import { hasLicensedFlag, testEditionOverride } from "@utils/netbird";

/**
 * Endpoint that is only served by licensed management servers.
 * Open-source management returns 404 for it.
 */
const LICENSE_PROBE_ENDPOINT = "/integrations/event-streaming";

/**
 * Error codes that indicate the endpoint exists but the request was not
 * authorized, which still proves a licensed management server.
 */
const ENDPOINT_EXISTS_ERROR_CODES = [401, 403, 405];

/**
 * useIsLicensed determines whether premium features are available on this
 * deployment. NetBird Cloud and deployments with NETBIRD_LICENSED=true are
 * licensed by definition. For backwards compatibility, deployments without
 * the flag are probed once against a licensed-only management endpoint.
 */
export const useIsLicensed = (): {
  isLicensed: boolean;
  isLoading: boolean;
} => {
  const declared = hasLicensedFlag();
  const override = testEditionOverride();
  const { data, error, isLoading } = useFetchApi<unknown>(
    LICENSE_PROBE_ENDPOINT,
    true,
    false,
    !declared && !override,
    { shouldRetryOnError: false },
  );

  if (override) return { isLicensed: override !== "oss", isLoading: false };
  if (declared) return { isLicensed: true, isLoading: false };
  if (isLoading) return { isLicensed: false, isLoading: true };
  if (error) {
    return {
      isLicensed: ENDPOINT_EXISTS_ERROR_CODES.includes(error.code),
      isLoading: false,
    };
  }
  return { isLicensed: data !== undefined, isLoading: false };
};

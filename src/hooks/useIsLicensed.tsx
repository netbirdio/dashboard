import useFetchApi from "@utils/api";
import loadConfig from "@utils/config";
import { hasLicensedFlag, testEditionOverride } from "@utils/netbird";
import { useEffect, useState } from "react";

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
 * Probe result is cached so open-source deployments do not re-request the
 * licensed-only endpoint on every page load. The TTL lets a later license
 * activation be picked up without forcing the user to clear storage.
 */
const LICENSE_CACHE_PREFIX = "netbird-licensed:";
const LICENSE_CACHE_TTL_MS = 60 * 60 * 1000;

const licenseCacheKey = () => `${LICENSE_CACHE_PREFIX}${loadConfig().apiOrigin}`;

const readLicenseCache = (): boolean | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(licenseCacheKey());
    if (!raw) return undefined;
    const { value, ts } = JSON.parse(raw) as { value: boolean; ts: number };
    if (typeof value !== "boolean" || typeof ts !== "number") return undefined;
    if (Date.now() - ts > LICENSE_CACHE_TTL_MS) return undefined;
    return value;
  } catch (e) {
    return undefined;
  }
};

const writeLicenseCache = (value: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      licenseCacheKey(),
      JSON.stringify({ value, ts: Date.now() }),
    );
  } catch (e) {}
};

/**
 * useIsLicensed determines whether premium features are available on this
 * deployment. NetBird Cloud and deployments with NETBIRD_LICENSED=true are
 * licensed by definition. For backwards compatibility, deployments without
 * the flag are probed once against a licensed-only management endpoint and the
 * result is cached so the probe does not repeat on every page load.
 */
export const useIsLicensed = (): {
  isLicensed: boolean;
  isLoading: boolean;
} => {
  const declared = hasLicensedFlag();
  const override = testEditionOverride();

  const [cached] = useState<boolean | undefined>(() =>
    declared || override ? undefined : readLicenseCache(),
  );

  const shouldProbe = !declared && !override && cached === undefined;
  const { data, error, isLoading } = useFetchApi<unknown>(
    LICENSE_PROBE_ENDPOINT,
    true,
    false,
    shouldProbe,
    { shouldRetryOnError: false },
  );

  let isLicensed = false;
  let resolvedLoading = false;
  if (override) {
    isLicensed = override !== "oss";
  } else if (declared) {
    isLicensed = true;
  } else if (cached !== undefined) {
    isLicensed = cached;
  } else if (isLoading) {
    resolvedLoading = true;
  } else if (error) {
    isLicensed = ENDPOINT_EXISTS_ERROR_CODES.includes(error.code);
  } else {
    isLicensed = data !== undefined;
  }

  useEffect(() => {
    if (!shouldProbe || isLoading) return;
    writeLicenseCache(isLicensed);
  }, [shouldProbe, isLoading, isLicensed]);

  return { isLicensed, isLoading: resolvedLoading };
};

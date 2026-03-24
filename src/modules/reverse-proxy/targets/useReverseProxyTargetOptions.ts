import { useCallback, useState } from "react";
import { ServiceTargetOptions } from "@/interfaces/ReverseProxy";
import {
  headerEntriesToRecord,
  useCustomHeaders,
} from "@/modules/reverse-proxy/targets/ReverseProxyTargetCustomHeaders";

// Go time.ParseDuration format: one or more {number}{unit} pairs
const DURATION_RE = /^(\d+(\.\d+)?(ns|us|µs|ms|s|m|h))+$/;

export function validateTimeout(timeout: string): string | undefined {
  if (!timeout) return undefined;
  if (!DURATION_RE.test(timeout))
    return 'Invalid duration, use e.g., "10s", "30s", "1m"';
  return undefined;
}

export function validateSessionIdleTimeout(
  timeout: string,
): string | undefined {
  if (!timeout) return undefined;
  if (!DURATION_RE.test(timeout))
    return 'Invalid duration, use e.g., "30s", "2m", "5m"';
  return undefined;
}

export function useReverseProxyTargetOptions(
  initialOptions?: ServiceTargetOptions,
) {
  const [targetOptions, setTargetOptions] = useState<ServiceTargetOptions>(
    () => {
      const { custom_headers: _, ...rest } = initialOptions ?? {};
      return rest;
    },
  );

  const {
    headerEntries,
    addHeader,
    removeHeader,
    updateHeaderEntry,
    headerErrors,
    hasHeaderErrors,
  } = useCustomHeaders(initialOptions?.custom_headers);

  const updateOption = useCallback(
    <K extends keyof ServiceTargetOptions>(
      key: K,
      value: ServiceTargetOptions[K],
    ) => {
      setTargetOptions((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const timeoutError = validateTimeout(targetOptions.request_timeout ?? "");
  const sessionIdleTimeoutError = validateSessionIdleTimeout(
    targetOptions.session_idle_timeout ?? "",
  );
  const hasOptionsErrors =
    !!timeoutError || !!sessionIdleTimeoutError || hasHeaderErrors;

  const getTargetOptions = useCallback((): ServiceTargetOptions | undefined => {
    const customHeaders = headerEntriesToRecord(headerEntries);
    const merged: ServiceTargetOptions = {
      ...targetOptions,
      custom_headers: customHeaders,
    };
    const hasOptions = Object.values(merged).some((v) => v !== undefined);
    return hasOptions ? merged : undefined;
  }, [targetOptions, headerEntries]);

  return [
    targetOptions,
    updateOption,
    {
      getTargetOptions,
      headers: {
        headerEntries,
        addHeader,
        removeHeader,
        updateHeaderEntry,
        headerErrors,
        hasHeaderErrors,
      },
      errors: {
        timeout: timeoutError,
        sessionIdleTimeout: sessionIdleTimeoutError,
        options: hasOptionsErrors,
      },
    },
  ] as const;
}

import {
  useOidc,
  useOidcAccessToken,
  useOidcIdToken,
} from "@axa-fr/react-oidc";
import loadConfig from "@utils/config";
import { sleep } from "@utils/helpers";
import { usePathname } from "next/navigation";
import { isExpired } from "react-jwt";
import useSWR from "swr";
import { useErrorBoundary } from "@/contexts/ErrorBoundary";

type Method = "GET" | "POST" | "PUT" | "DELETE";

export type ErrorResponse = {
  code: number;
  message: string;
};

const config = loadConfig();

type RequestOptions = {
  signal?: AbortSignal;
};

async function apiRequest<T>(
  oidcFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  method: Method,
  url: string,
  data?: any,
  options?: RequestOptions,
) {
  const origin = config.apiOrigin;

  const res = await oidcFetch(`${origin}/api${url}`, {
    method,
    body: JSON.stringify(data),
    signal: options?.signal,
  });

  try {
    if (!res.ok) {
      const error = (await res.json()) as ErrorResponse;
      return Promise.reject(error);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (!res.ok) {
      const error = {
        code: res.status,
        message: res.statusText,
      } as ErrorResponse;
      return Promise.reject(error);
    }
    return res;
  }
}

export function useNetBirdFetch(ignoreError: boolean = false): {
  fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
} {
  const tokenSource = config.tokenSource || "accessToken";
  const { idToken } = useOidcIdToken();
  const { accessToken } = useOidcAccessToken();
  const token = tokenSource.toLowerCase() == "idtoken" ? idToken : accessToken;
  const handleErrors = useApiErrorHandling(ignoreError);

  const isTokenExpired = async () => {
    let attempts = 20;
    while (isExpired(token) && attempts > 0) {
      await sleep(500);
      attempts = attempts - 1;
    }
    return isExpired(token);
  };

  const nativeFetch = async (input: RequestInfo, init?: RequestInit) => {
    const tokenExpired = await isTokenExpired();
    if (tokenExpired) {
      return handleErrors({
        code: 401,
        message: "token expired",
      } as ErrorResponse);
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    return fetch(input, {
      ...init,
      headers,
    });
  };

  return {
    fetch: nativeFetch as (
      input: RequestInfo,
      init?: RequestInit,
    ) => Promise<Response>,
  };
}

export default function useFetchApi<T>(
  url: string,
  ignoreError = false,
  revalidate = true,
  allowFetch = true,
) {
  const { fetch } = useNetBirdFetch(ignoreError);
  const handleErrors = useApiErrorHandling(ignoreError);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    url,
    async (url) => {
      if (!allowFetch) return;
      return apiRequest<T>(fetch, "GET", url).catch((err) =>
        handleErrors(err as ErrorResponse),
      );
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: revalidate,
      revalidateIfStale: revalidate,
      revalidateOnReconnect: revalidate,
    },
  );

  return {
    data: data as T | undefined,
    error,
    isLoading,
    isValidating,
    mutate,
  } as const;
}

export function useApiCall<T>(url: string, ignoreError = false) {
  const { fetch } = useNetBirdFetch(ignoreError);
  const handleErrors = useApiErrorHandling(ignoreError);

  return {
    post: async (data: any, suffix = "", options?: RequestOptions) => {
      return apiRequest<T>(fetch, "POST", url + suffix, data, options)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse)) as Promise<T>;
    },
    put: async (data: any, suffix = "", options?: RequestOptions) => {
      return apiRequest<T>(fetch, "PUT", url + suffix, data, options)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse)) as Promise<T>;
    },
    del: async (data: any = "", suffix = "", options?: RequestOptions) => {
      return apiRequest<T>(fetch, "DELETE", url + suffix, data, options)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse)) as Promise<T>;
    },
    get: async (suffix = "", options?: RequestOptions) => {
      return apiRequest<T>(fetch, "GET", url + suffix, undefined, options)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse)) as Promise<T>;
    },
  };
}

export function useApiErrorHandling(ignoreError = false) {
  const { login } = useOidc();
  const currentPath = usePathname();
  const { setError } = useErrorBoundary();
  if (ignoreError)
    return (err: ErrorResponse) => {
      console.log(err);
      return Promise.reject(err);
    };

  return (err: ErrorResponse) => {
    if (err.code == 401 && err.message == "no valid authentication provided") {
      return login(currentPath);
    }
    if (err.code == 401 && err.message == "token expired") {
      return login(currentPath);
    }
    if (err.code == 401 && err.message == "token invalid") {
      setError(err);
    }
    if (err.code == 500 && err.message == "internal server error") {
      setError(err);
    }
    if (err.code > 400 && err.code <= 500) {
      setError(err);
    }

    return Promise.reject(err);
  };
}

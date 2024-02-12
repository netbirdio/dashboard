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

async function apiRequest<T>(
  oidcFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  method: Method,
  url: string,
  data?: any,
) {
  const origin = config.apiOrigin;
  const res = await oidcFetch(`${origin}/api${url}`, {
    method,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = (await res.json()) as ErrorResponse;
    return Promise.reject(error);
  }

  return (await res.json()) as T;
}

export function useNetBirdFetch() {
  const tokenSource = config.tokenSource || "accessToken";
  const { idToken } = useOidcIdToken();
  const { accessToken } = useOidcAccessToken();
  const token = tokenSource.toLowerCase() == "idtoken" ? idToken : accessToken;
  const handleErrors = useApiErrorHandling();

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
      return handleErrors({ code: 401, message: "token expired" });
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
    fetch: nativeFetch,
  };
}

export default function useFetchApi<T>(url: string) {
  const { fetch } = useNetBirdFetch();
  const handleErrors = useApiErrorHandling();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    url,
    async (url) => {
      return apiRequest<T>(fetch, "GET", url).catch((err) =>
        handleErrors(err as ErrorResponse),
      );
    },
    {
      keepPreviousData: true,
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

export function useApiCall<T>(url: string) {
  const { fetch } = useNetBirdFetch();
  const handleErrors = useApiErrorHandling();

  return {
    post: async (data: any, suffix = "") => {
      return apiRequest<T>(fetch, "POST", url + suffix, data)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse));
    },
    put: async (data: any, suffix = "") => {
      return apiRequest<T>(fetch, "PUT", url + suffix, data)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse));
    },
    del: async (data: any = "", suffix = "") => {
      return apiRequest<T>(fetch, "DELETE", url + suffix, data)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse));
    },
    get: async (suffix = "") => {
      return apiRequest<T>(fetch, "GET", url + suffix)
        .then((res) => Promise.resolve(res as T))
        .catch((err) => handleErrors(err as ErrorResponse));
    },
  };
}

export function useApiErrorHandling() {
  const { login } = useOidc();
  const currentPath = usePathname();
  const { setError } = useErrorBoundary();

  return (err: ErrorResponse) => {
    if (err.code == 401 && err.message == "no valid authentication provided") {
      return login(currentPath);
    }
    if (err.code == 401 && err.message == "token expired") {
      return login(currentPath);
    }
    if (err.code == 401 && err.message == "token invalid") {
      return setError(err);
    }
    if (err.code == 500 && err.message == "internal server error") {
      return setError(err);
    }

    return Promise.reject(err);
  };
}

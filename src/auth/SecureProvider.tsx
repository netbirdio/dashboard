import { OidcSecure, useOidc } from "@axa-fr/react-oidc";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

const QUERY_PARAMS_KEY = "netbird-query-params";
const PRESERVE_QUERY_PARAMS_PATHS = ["/peer/ssh", "/peer/rdp", "/peer/vnc"];

type StoredQueryParams = { path: string; params: string };

const VALID_PARAMS = [
  "tab",
  "search",
  "id",
  "invite",
  "utm_source",
  "utm_medium",
  "utm_content",
  "utm_campaign",
  "hs_id",
  "page",
  "page_size",
  "user",
  "port",
  "ip_version",
  "mode",
  "quality",
  "scale",
  "resize",
  "cursor",
];

function filterAllowedParams(raw: string): string {
  const input = new URLSearchParams(raw);
  const output = new URLSearchParams();
  for (const key of VALID_PARAMS) {
    for (const v of input.getAll(key)) output.append(key, v);
  }
  return output.toString();
}

function storeQueryParams(path: string, rawParams: string) {
  const filtered = filterAllowedParams(rawParams);
  if (!filtered) return;
  const data: StoredQueryParams = { path, params: filtered };
  localStorage.setItem(QUERY_PARAMS_KEY, JSON.stringify(data));
}

type Props = {
  children: React.ReactNode;
};
export const SecureProvider = ({ children }: Props) => {
  const { isAuthenticated, login } = useOidc();
  const currentPath = usePathname();

  useEffect(() => {
    if (isAuthenticated) {
      try {
        const params = window.location.search.substring(1);
        // Persist on every render while on a remote-access path. The OIDC
        // library can fire a redirect synchronously when an access token
        // expires, before the !isAuthenticated branch of this effect ever
        // runs, so the peer id would be lost across the round-trip otherwise.
        if (PRESERVE_QUERY_PARAMS_PATHS.includes(currentPath) && params) {
          storeQueryParams(currentPath, params);
          return;
        }
        const stored = localStorage.getItem(QUERY_PARAMS_KEY);
        if (stored && !window.location.search) {
          const data: StoredQueryParams = JSON.parse(stored);
          if (data?.path === currentPath && data?.params) {
            localStorage.removeItem(QUERY_PARAMS_KEY);
            window.history.replaceState(
              null,
              "",
              `${currentPath}?${data.params}`,
            );
          }
        }
      } catch (e) {}
    } else {
      try {
        const params = window.location.search.substring(1);
        if (params) {
          storeQueryParams(currentPath, params);
        }
      } catch (e) {}
    }
  }, [isAuthenticated, currentPath]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined = undefined;
    if (!isAuthenticated) {
      timeout = setTimeout(async () => {
        if (!isAuthenticated) {
          await login(currentPath);
        }
      }, 1500);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [currentPath, isAuthenticated, login]);

  return (
    <>
      <OidcSecure callbackPath={currentPath}>{children}</OidcSecure>
    </>
  );
};

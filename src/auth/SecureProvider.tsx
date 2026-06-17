import { OidcSecure, useOidc } from "@axa-fr/react-oidc";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

const QUERY_PARAMS_KEY = "netbird-query-params";
const PRESERVE_QUERY_PARAMS_PATHS = ["/peer/ssh", "/peer/rdp", "/peer/vnc"];
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
];

type Props = {
  children: React.ReactNode;
};
export const SecureProvider = ({ children }: Props) => {
  const { isAuthenticated, login } = useOidc();
  const currentPath = usePathname();

  useEffect(() => {
    const onPreservePath = PRESERVE_QUERY_PARAMS_PATHS.includes(currentPath);
    if (isAuthenticated && !onPreservePath) {
      localStorage.removeItem(QUERY_PARAMS_KEY);
      return;
    }
    // Persist on every render while we're on a preserve path. The OIDC
    // library can fire a redirect synchronously when an access token
    // expires, before the !isAuthenticated branch of this effect ever
    // runs, so the peer id would be lost across the round-trip otherwise.
    try {
      const params = window.location.search.substring(1);
      if (!params) {
        return;
      }
      const urlParams = new URLSearchParams(params);
      if (VALID_PARAMS.some((param) => urlParams.has(param))) {
        localStorage.setItem(QUERY_PARAMS_KEY, JSON.stringify(params));
      }
    } catch {
      // localStorage may be unavailable in private-mode or restricted
      // contexts; the worst case is the peer id is not restored.
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

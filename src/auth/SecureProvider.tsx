import { OidcSecure, useOidc } from "@axa-fr/react-oidc";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

const QUERY_PARAMS_KEY = "netbird-query-params";
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
    if (isAuthenticated) {
      localStorage.removeItem(QUERY_PARAMS_KEY);
    } else {
      try {
        const params = window.location.search.substring(1);
        if (params) {
          const urlParams = new URLSearchParams(params);
          if (VALID_PARAMS.some((param) => urlParams.has(param))) {
            localStorage.setItem(QUERY_PARAMS_KEY, JSON.stringify(params));
          }
        }
      } catch (e) {}
    }
  }, [isAuthenticated]);

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

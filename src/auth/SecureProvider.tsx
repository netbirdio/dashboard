import { OidcSecure, useOidc } from "@axa-fr/react-oidc";
import loadConfig from "@utils/config";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

type Props = {
  children: React.ReactNode;
};

const config = loadConfig();

export const SecureProvider = ({ children }: Props) => {
  const { isAuthenticated, login } = useOidc();
  const currentPath = usePathname();

  useEffect(() => {
    console.log("isAuthenticated", isAuthenticated);
    if (!isAuthenticated) {
      console.info("Not authenticated, logging in...");
      login(currentPath, { client_id: config.clientId });
    }
  }, [currentPath, isAuthenticated, login]);

  return (
    <>
      <OidcSecure callbackPath={currentPath}>{children}</OidcSecure>
    </>
  );
};

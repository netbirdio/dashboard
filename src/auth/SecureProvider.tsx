import { OidcSecure, useOidc } from "@axa-fr/react-oidc";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";

type Props = {
  children: React.ReactNode;
};
export const SecureProvider = ({ children }: Props) => {
  const { isAuthenticated, login } = useOidc();
  const currentPath = usePathname();

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

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
    if (!isAuthenticated) {
      login(currentPath);
    }
  }, [currentPath, isAuthenticated, login]);

  return (
    <>
      <OidcSecure callbackPath={currentPath}>{children}</OidcSecure>
    </>
  );
};

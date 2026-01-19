import * as React from "react";
import { createContext, useContext } from "react";
import { SSOIdentityProviderType } from "@/interfaces/IdentityProvider";

const UserIdpContext = createContext<SSOIdentityProviderType | undefined>(
  undefined,
);

export const UserIdpProvider = ({
  idpType,
  children,
}: {
  idpType?: SSOIdentityProviderType;
  children: React.ReactNode;
}) => {
  return (
    <UserIdpContext.Provider value={idpType}>
      {children}
    </UserIdpContext.Provider>
  );
};

export const useUserIdp = () => useContext(UserIdpContext);